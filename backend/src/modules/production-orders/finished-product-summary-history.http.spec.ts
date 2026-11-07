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

describe('Finished product summary history HTTP', () => {
  let app: INestApplication<Server>;
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const count = jest.fn();
  const networkAllowed = jest.fn();

  beforeAll(async () => {
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
          provide: PrismaService,
          useValue: {
            productionOrderFinishedProductSummaries: { findUnique },
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
            id: 3,
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
    await app.close();
  });

  const get = () =>
    request(app.getHttpServer())
      .get('/production-orders/finished-product-summaries/7/history')
      .set('Authorization', 'test');

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
