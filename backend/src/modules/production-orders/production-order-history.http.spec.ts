import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProductionOrderHistoryController } from './production-order-history.controller';
import { ProductionOrderHistoryService } from './production-order-history.service';

describe('ProductionOrderHistory HTTP', () => {
  let app: INestApplication<Server>;
  const findUnique = jest.fn();
  const findForEntities = jest.fn();
  const networkAllowed = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductionOrderHistoryController],
      providers: [
        ProductionOrderHistoryService,
        {
          provide: PrismaService,
          useValue: {
            productionOrderDensityChecks: { findUnique },
            productionOrders: { findUnique },
          },
        },
        { provide: AuditLogsService, useValue: { findForEntities } },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { permissions: string[] };
          }>();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
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
    findUnique.mockResolvedValue({ id: 7 });
    findForEntities.mockResolvedValue({ data: [], meta: { total: 0 } });
    networkAllowed.mockReturnValue(true);
  });
  afterAll(async () => {
    await app.close();
  });
  const get = (resource = 'density-check', id = '7') =>
    request(app.getHttpServer())
      .get(`/production-orders/history/${resource}/${id}`)
      .set('Authorization', 'test');

  it('routes the request and strips forged entity filters', async () => {
    await get()
      .query({ page: 2, limit: 20, entity_type: 'users', entity_id: '999' })
      .expect(200);
    expect(findForEntities).toHaveBeenCalledWith(
      [{ entityType: 'production_order_density_checks', ids: [7] }],
      { page: 2, limit: 20 },
    );
  });
  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/production-orders/history/density-check/7')
      .expect(401);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('requires the dedicated permission and blocks writes-only users', async () => {
    await get('date-check').expect(403);
    await get()
      .set('x-test-permission', 'production-orders.update')
      .expect(403);
    expect(findForEntities).not.toHaveBeenCalled();
  });
  it('enforces the network restriction', async () => {
    networkAllowed.mockReturnValue(false);
    await get().expect(403);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('returns 404 for a record outside the scope or an unregistered resource', async () => {
    findUnique.mockResolvedValue(null);
    await get().expect(404);
    await get('users').expect(404);
    expect(findForEntities).not.toHaveBeenCalled();
  });
  it.each([{ page: 0 }, { limit: 101 }, { scope: 'all' }])(
    'validates history query %j',
    async (query) => {
      await get().query(query).expect(400);
      expect(findForEntities).not.toHaveBeenCalled();
    },
  );
});
