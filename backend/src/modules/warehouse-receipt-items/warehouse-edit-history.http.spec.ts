import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WarehouseReceiptHistoryController } from './warehouse-receipt-history.controller';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';
import { WarehouseTemperatureHumidityHistoryController } from '../warehouse-temperature-humidity-checks/warehouse-temperature-humidity-history.controller';
import { WarehouseTemperatureHumidityChecksService } from '../warehouse-temperature-humidity-checks/warehouse-temperature-humidity-checks.service';

describe.each([
  [
    'warehouse-receipt-items',
    WarehouseReceiptHistoryController,
    WarehouseReceiptItemsService,
  ],
  [
    'warehouse-temperature-humidity-checks',
    WarehouseTemperatureHumidityHistoryController,
    WarehouseTemperatureHumidityChecksService,
  ],
] as const)('%s edit history HTTP', (route, controller, service) => {
  let app: INestApplication<Server>;
  const findById = jest.fn();
  const audit = {
    findAll: jest.fn(),
    findForEntities: jest.fn(),
    findHistoricalEntityIds: jest.fn(),
  };
  const result = {
    data: [],
    meta: { page: 2, limit: 10, total: 0, total_pages: 0 },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [controller],
      providers: [
        { provide: service, useValue: { findById } },
        { provide: AuditLogsService, useValue: audit },
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
            id: 5,
            permissions: [
              req.headers['x-test-permission'] ??
                'warehouse-receipt-items.read-own',
            ],
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue({
      id: 7,
      attachments: [{ id: 20 }],
      sapConfirmation: { id: 30 },
    });
    audit.findAll.mockResolvedValue(result);
    audit.findForEntities.mockResolvedValue(result);
    audit.findHistoricalEntityIds.mockImplementation((type: string) =>
      Promise.resolve(type.endsWith('attachments') ? [20, 21] : [30]),
    );
  });
  afterAll(async () => {
    await app.close();
  });

  const get = (id: string | number = 7) =>
    request(app.getHttpServer())
      .get(`/${route}/${id}/history`)
      .set('Authorization', 'Bearer test');

  it('checks detail access and fixes the entity scope despite forged query filters', async () => {
    await get()
      .query({ page: 2, limit: 10, entity_id: '99', entity_type: 'users' })
      .expect(200, result);
    expect(findById).toHaveBeenCalledWith(7);
    if (route === 'warehouse-receipt-items') {
      expect(audit.findForEntities).toHaveBeenCalledWith(
        [
          { entityType: 'warehouse_receipt_items', ids: [7] },
          { entityType: 'warehouse_receipt_item_attachments', ids: [20, 21] },
          { entityType: 'warehouse_receipt_item_sap_confirmations', ids: [30] },
        ],
        { page: 2, limit: 10 },
      );
      expect(audit.findHistoricalEntityIds).toHaveBeenCalledWith(
        'warehouse_receipt_item_attachments',
        'warehouse_receipt_item_id',
        [7],
      );
    } else {
      expect(audit.findAll).toHaveBeenCalledWith({
        entity_type: 'warehouse_temperature_humidity_checks',
        entity_id: '7',
        page: 2,
        limit: 10,
      });
    }
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get(`/${route}/7/history`).expect(401);
    expect(findById).not.toHaveBeenCalled();
  });

  it('never reads audit logs if detail is missing or outside the user scope', async () => {
    findById.mockRejectedValue(new NotFoundException());
    await get().expect(404);
    expect(audit.findAll).not.toHaveBeenCalled();
    expect(audit.findForEntities).not.toHaveBeenCalled();
    expect(audit.findHistoricalEntityIds).not.toHaveBeenCalled();
  });

  it('rejects invalid record identifiers', async () => {
    await get('invalid').expect(400);
    expect(findById).not.toHaveBeenCalled();
  });

  it.each([{ page: 0 }, { limit: 101 }, { page: 1.5 }, { limit: 'invalid' }])(
    'rejects invalid pagination %j',
    async (query) => {
      await get().query(query).expect(400);
      expect(findById).not.toHaveBeenCalled();
    },
  );

  if (route === 'warehouse-receipt-items') {
    it('requires receipt read permission', async () => {
      await get().set('x-test-permission', 'items.read').expect(403);
      expect(findById).not.toHaveBeenCalled();
    });
  }
});
