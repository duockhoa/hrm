import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from 'src/prisma.service';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';

describe('Finished product summary history HTTP', () => {
  let app: INestApplication<Server>;
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const findMany = jest.fn();
  const count = jest.fn();
  const networkAllowed = jest.fn();
  const getProductionReceipts = jest.fn();
  const loginPersonal = jest.fn();
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'sap-cookie-http-test-secret';
    const dependencies = Reflect.getMetadata(
      'design:paramtypes',
      ProductionOrdersController,
    ) as unknown[];
    const module = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        ...dependencies
          .filter(
            (dependency) =>
              dependency !== ProductionOrderFinishedProductSummariesService,
          )
          .map((dependency) => ({
            provide: dependency as new () => unknown,
            useValue: {},
          })),
        ProductionOrderFinishedProductSummariesService,
        AuditLogsService,
        {
          provide: SapB1ServiceLayerClient,
          useValue: { getProductionReceipts, loginPersonal },
        },
        {
          provide: PrismaService,
          useValue: {
            productionOrderFinishedProductSummaries: { findUnique, updateMany },
            auditLogs: { findMany, count },
            $transaction: (operations: Promise<unknown>[]) =>
              Promise.all(operations),
          },
        },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { id: number; permissions: string[] };
          }>();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            id: Number(req.headers['x-test-user-id'] ?? 3),
            permissions: [
              req.headers['x-test-permission'] ?? 'production-orders.read',
            ],
          };
          return true;
        },
      })
      .overrideGuard(NetworkPolicyGuard)
      .useValue({ canActivate: networkAllowed })
      .compile();
    app = module.createNestApplication<INestApplication<Server>>();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    networkAllowed.mockReturnValue(true);
    findUnique.mockResolvedValue({ id: 7 });
    findMany.mockResolvedValue([
      {
        id: 1n,
        entity_id: 7n,
        actor_id: 3n,
        action: 'UPDATE',
        old_values: { package_count: 1 },
        new_values: { package_count: 2 },
      },
    ]);
    count.mockResolvedValue(21);
  });

  afterAll(async () => {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    await app.close();
  });

  const get = () =>
    request(app.getHttpServer())
      .get('/production-orders/finished-product-summaries/7/history')
      .set('Authorization', 'test');

  const confirm = () =>
    request(app.getHttpServer())
      .post(
        '/production-orders/finished-product-summaries/7/warehouse-confirmation',
      )
      .set('Authorization', 'test');

  it('reuses a protected SAP cookie for its WMS user and never returns SAP secrets', async () => {
    const path = '/production-orders/finished-product-summaries/sap-session';
    const permission =
      'production-orders.finished-product-summaries.warehouse-confirm';
    loginPersonal.mockResolvedValue({
      session: { sessionId: 'sap-personal-test-token', routeId: '.node1' },
      timeoutMinutes: 45,
    });
    const login = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'test')
      .set('x-test-permission', permission)
      .send({ username: 'warehouse-user', password: 'test-only' })
      .expect(201, { active: true, username: 'warehouse-user' });
    const cookie = String(login.headers['set-cookie'][0]);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=1800');
    expect(cookie).not.toContain('sap-personal-test-token');
    expect(cookie).not.toContain('test-only');
    const status = () =>
      request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'test')
        .set('x-test-permission', permission)
        .set('Cookie', cookie.split(';')[0]);
    await status().expect(200, { active: true, username: 'warehouse-user' });
    await status().set('x-test-user-id', '4').expect(200, { active: false });
    expect(loginPersonal).toHaveBeenCalledTimes(1);
  });

  it('requires the personal SAP cookie before reading or posting a receipt', async () => {
    await request(app.getHttpServer())
      .post(
        '/production-orders/finished-product-summaries/7/sap-production-receipts',
      )
      .set('Authorization', 'test')
      .set(
        'x-test-permission',
        'production-orders.finished-product-summaries.warehouse-confirm',
      )
      .send({
        requestId: '8bc4d331-c62e-447a-8c6d-6fcd92a63179',
        postingDate: '2026-11-24',
        quantity: 2345,
        warehouseCode: 'K-TP',
        lotNumber: '1250926',
        manufacturingDate: '2026-09-25',
        expiryDate: '2028-09-25',
      })
      .expect(428)
      .expect(({ body }) => expect(body.code).toBe('SAP_SESSION_REQUIRED'));
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('requires summary read permission and resolves the SAP order from the summary', async () => {
    const path =
      '/production-orders/finished-product-summaries/7/sap-production-receipts';
    const getReceipts = () => request(app.getHttpServer()).get(path);
    await getReceipts().expect(401);
    await getReceipts()
      .set('Authorization', 'test')
      .set('x-test-permission', 'production-orders.list')
      .expect(403);
    expect(getProductionReceipts).not.toHaveBeenCalled();

    const productionOrder = {
      id: 3353,
      item_code: 'TP001',
      lot_no: '001',
      production_order_code: null,
    };
    findUnique.mockResolvedValue({ productionOrder });
    const receipts = [{ DocEntry: 2096, DocNum: 2096, DocumentLines: [] }];
    getProductionReceipts.mockResolvedValue(receipts);
    await getReceipts()
      .set('Authorization', 'test')
      .query({ productionOrderId: 9999 })
      .expect(200, receipts);
    expect(getProductionReceipts).toHaveBeenCalledWith(productionOrder);
  });

  it('restricts posting to the warehouse permission and rejects client-supplied order keys', async () => {
    const postReceipt = () =>
      request(app.getHttpServer())
        .post(
          '/production-orders/finished-product-summaries/7/sap-production-receipts',
        )
        .set('Authorization', 'test');
    await postReceipt().expect(403);
    await postReceipt()
      .set(
        'x-test-permission',
        'production-orders.finished-product-summaries.warehouse-confirm',
      )
      .send({
        requestId: '8bc4d331-c62e-447a-8c6d-6fcd92a63179',
        postingDate: '2026-11-24',
        quantity: 2345,
        warehouseCode: 'K-TP',
        lotNumber: '1250926',
        manufacturingDate: '2026-09-25',
        expiryDate: '2028-09-25',
        BaseEntry: 9999,
      })
      .expect(400);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('requires authentication and warehouse confirmation permission', async () => {
    await request(app.getHttpServer())
      .post(
        '/production-orders/finished-product-summaries/7/warehouse-confirmation',
      )
      .expect(401);
    await confirm().expect(403);
    await confirm()
      .set('x-test-permission', 'production-orders.update')
      .expect(403);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('uses the signed-in employee and server time instead of forged body fields', async () => {
    findUnique.mockResolvedValue({
      id: 7,
      warehouse_confirmed_by_id: 3,
      warehouse_confirmed_at: new Date(),
      productionOrder: { samplingRequests: [] },
    });
    updateMany.mockResolvedValue({ count: 1 });
    const response = await confirm()
      .set(
        'x-test-permission',
        'production-orders.finished-product-summaries.warehouse-confirm',
      )
      .send({
        warehouse_confirmed_by_id: 999,
        warehouse_confirmed_at: '2000-01-01',
      })
      .expect(201);
    expect(response.body.warehouse_confirmed_by_id).toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 7, warehouse_confirmed_at: null },
      data: {
        warehouse_confirmed_by_id: 3,
        warehouse_confirmed_at: expect.any(Date),
      },
    });
  });

  it('returns paginated history for the requested summary and ignores forged entity filters', async () => {
    const response = await get()
      .query({ page: 2, limit: 20, entity_type: 'users', entity_id: '99' })
      .expect(200);
    const body = response.body as {
      meta: { page: number; limit: number; total: number; total_pages: number };
      data: { id: string; entity_id: string; actor_id: string }[];
    };
    expect(body.meta).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      total_pages: 2,
    });
    expect(body.data[0]).toMatchObject({
      id: '1',
      entity_id: '7',
      actor_id: '3',
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: 'production_order_finished_product_summaries',
          entity_id: 7n,
        },
        skip: 20,
        take: 20,
      }),
    );
  });

  it('requires authentication and read permission', async () => {
    await request(app.getHttpServer())
      .get('/production-orders/finished-product-summaries/7/history')
      .expect(401);
    await get()
      .set('x-test-permission', 'production-orders.update')
      .expect(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('preserves the network restriction', async () => {
    networkAllowed.mockReturnValue(false);
    await get().expect(403);
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('does not read logs when the scoped summary lookup fails', async () => {
    findUnique.mockResolvedValue(null);
    await get().expect(404);
    expect(findMany).not.toHaveBeenCalled();
  });

  it.each([
    { page: 0 },
    { page: 'abc' },
    { page: 1.5 },
    { limit: 0 },
    { limit: 101 },
  ])('rejects invalid paging: %j', async (query) => {
    await get().query(query).expect(400);
    expect(findMany).not.toHaveBeenCalled();
  });
});
