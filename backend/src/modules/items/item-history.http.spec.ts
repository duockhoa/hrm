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
import { ItemHistoryController } from './item-history.controller';

describe('Item history HTTP', () => {
  let app: INestApplication<Server>;
  const findUnique = jest.fn();
  const findForItem = jest.fn();
  const networkAllowed = jest.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ItemHistoryController],
      providers: [
        { provide: PrismaService, useValue: { items: { findUnique } } },
        { provide: AuditLogsService, useValue: { findForItem } },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers.authorization) throw new UnauthorizedException();
          req.user = {
            permissions: [req.headers['x-test-permission'] ?? 'items.read'],
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
    findUnique.mockImplementation(async ({ where }) => ({
      item_code: where.item_code,
      deleted_at: null,
    }));
    findForItem.mockResolvedValue({ data: [], meta: { total: 0 } });
    networkAllowed.mockReturnValue(true);
  });
  afterAll(async () => {
    await app.close();
  });
  const get = (code = 'TP0001') =>
    request(app.getHttpServer())
      .get(`/items/${encodeURIComponent(code)}/history`)
      .set('Authorization', 'test');

  it.each(['TP0001', 'BTP0001'])(
    'reads only the selected product %s with validated pagination',
    async (code) => {
      await get(code)
        .query({
          page: 2,
          limit: 20,
          entity_key: 'OTHER',
          entity_type: 'users',
        })
        .expect(200);
      expect(findForItem).toHaveBeenCalledWith(code, { page: 2, limit: 20 });
    },
  );
  it('requires authentication and item read permission', async () => {
    await request(app.getHttpServer()).get('/items/TP0001/history').expect(401);
    await get().set('x-test-permission', 'items.update').expect(403);
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('enforces network restrictions', async () => {
    networkAllowed.mockReturnValue(false);
    await get().expect(403);
    expect(findForItem).not.toHaveBeenCalled();
  });
  it.each([null, { item_code: 'TP0001', deleted_at: new Date() }])(
    'does not expose history of a missing/deleted product',
    async (item) => {
      findUnique.mockResolvedValue(item);
      await get().expect(404);
      expect(findForItem).not.toHaveBeenCalled();
    },
  );
  it.each([{ page: 0 }, { limit: 101 }, { page: 'abc' }])(
    'rejects invalid pagination %j',
    async (query) => {
      await get().query(query).expect(400);
      expect(findForItem).not.toHaveBeenCalled();
    },
  );
});
