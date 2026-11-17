import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { jwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticationMiddleware } from '../middleware/authentication/authentication.middleware';
import { PrismaService } from '../prisma.service';
import { WarehouseReceiptItemsController } from '../modules/warehouse-receipt-items/warehouse-receipt-items.controller';
import { WarehouseReceiptItemsService } from '../modules/warehouse-receipt-items/warehouse-receipt-items.service';
import { WarehouseReceiptAttachmentsController } from '../modules/warehouse-receipt-items/warehouse-receipt-attachments.controller';
import { WarehouseReceiptAttachmentsService } from '../modules/warehouse-receipt-items/warehouse-receipt-attachments.service';
import { WarehouseReceiptSamplingDraftsController } from '../modules/warehouse-receipt-items/warehouse-receipt-sampling-drafts.controller';
import { WarehouseReceiptSamplingDraftsService } from '../modules/warehouse-receipt-items/warehouse-receipt-sampling-drafts.service';
import { WarehouseReceiptSamplingSendService } from '../modules/warehouse-receipt-items/warehouse-receipt-sampling-send.service';
import { warehouseReceiptScopeExtension } from './warehouse-receipt-scope.extension';

function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([field, value]: [string, any]) => {
    if (value === undefined) return true;
    if (field === 'AND')
      return (Array.isArray(value) ? value : [value]).every((part) =>
        matches(row, part),
      );
    if (field === 'OR') return value.some((part) => matches(row, part));
    if (value && typeof value === 'object') {
      if ('is' in value) return !!row[field] && matches(row[field], value.is);
      if ('in' in value) return value.in.includes(row[field]);
      if ('contains' in value)
        return String(row[field] ?? '').includes(value.contains);
      if ('equals' in value) return String(row[field]) === String(value.equals);
    }
    return row[field] === value;
  });
}

describe('Warehouse receipt access over HTTP', () => {
  let app: INestApplication;
  let permissions: string[];
  const receipts = [
    {
      id: 1,
      entered_by_id: 5,
      item_code: 'NL001',
      lot_number: 'OWN',
      received_at: new Date(),
      attachments: [],
    },
    {
      id: 2,
      entered_by_id: 6,
      item_code: 'NL001',
      lot_number: 'SECRET',
      received_at: new Date(),
      attachments: [],
    },
  ];
  const attachments = receipts.map((receipt) => ({
    id: receipt.id,
    warehouse_receipt_item_id: receipt.id,
    receipt,
    file_path: `/warehouse-receipt-items/attachment-files/${receipt.id}.png`,
    attachment_type: 'goods',
  }));
  const drafts = receipts.map((receipt) => ({
    id: receipt.id,
    created_by_id: 5,
    warehouse_receipt_item_id: receipt.id,
    receipt,
    request_type: 'NL',
    item_code: 'NL001',
  }));
  const sender = { send: jest.fn() };
  const client = new PrismaClient()
    .$extends(warehouseReceiptScopeExtension)
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args }) {
            const rows =
              model === 'WarehouseReceiptItems'
                ? receipts
                : model === 'WarehouseReceiptItemAttachments'
                  ? attachments
                  : model === 'WarehouseReceiptItemSamplingRequestDrafts'
                    ? [
                        ...drafts,
                        {
                          id: 3,
                          created_by_id: 5,
                          request_type: 'TP',
                          item_code: 'TP001',
                        },
                      ]
                    : model === 'Users'
                      ? [{ id: 5, deleted_at: null }]
                      : [];
            const input = args as any;
            const visible = rows.filter((row) => matches(row, input.where));
            if (operation === 'count') return visible.length;
            if (operation === 'findMany')
              return visible.slice(
                input.skip ?? 0,
                input.take ? (input.skip ?? 0) + input.take : undefined,
              );
            return visible[0] ?? null;
          },
        },
      },
    });
  const prisma = {
    warehouseReceiptItems: client.warehouseReceiptItems,
    warehouseReceiptItemAttachments: client.warehouseReceiptItemAttachments,
    warehouseReceiptItemSamplingRequestDrafts:
      client.warehouseReceiptItemSamplingRequestDrafts,
    warehouseReceiptSamplingSendBatches:
      client.warehouseReceiptSamplingSendBatches,
    users: client.users,
    $queryRaw: async () => [],
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        WarehouseReceiptItemsController,
        WarehouseReceiptAttachmentsController,
        WarehouseReceiptSamplingDraftsController,
      ],
      providers: [
        WarehouseReceiptItemsService,
        WarehouseReceiptAttachmentsService,
        WarehouseReceiptSamplingDraftsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WarehouseReceiptSamplingSendService, useValue: sender },
      ],
    })
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = { id: 5, permissions };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.use((req, res, next) =>
      new AuthenticationMiddleware().use(req, res, next),
    );
    await app.init();
  });
  beforeEach(() => {
    permissions = ['warehouse-receipt-items.read-own'];
    sender.send.mockReset();
  });
  afterAll(async () => {
    await app.close();
    await client.$disconnect();
  });

  it('filters rows and total before pagination and supports material-history queries', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/warehouse-receipt-items?item_code=NL001&page=1&limit=1&entered_by_id=6',
      )
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data.map((row) => row.id)).toEqual([1]);
    const next = await request(app.getHttpServer())
      .get('/warehouse-receipt-items?page=2&limit=1')
      .expect(200);
    expect(next.body.data).toEqual([]);
    expect(next.body.total).toBe(1);
  });
  it('cannot discover hidden records by search or direct ID', async () => {
    const result = await request(app.getHttpServer())
      .get('/warehouse-receipt-items?search=SECRET&page=1&limit=20')
      .expect(200);
    expect(result.body.total).toBe(0);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/2')
      .expect(404);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1')
      .expect(200);
  });
  it('allows read-all and prioritizes it when both permissions are assigned', async () => {
    permissions.push('warehouse-receipt-items.read-all');
    const result = await request(app.getHttpServer())
      .get('/warehouse-receipt-items?page=1&limit=20')
      .expect(200);
    expect(result.body.total).toBe(2);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/2')
      .expect(200);
  });
  it.each([
    '/warehouse-receipt-items/2/attachments',
    '/warehouse-receipt-items/2/attachments/2',
    '/warehouse-receipt-items/attachment-files/2.png',
    '/warehouse-receipt-items/2/sampling-request-draft',
  ])('does not expose a hidden receipt through %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
  });
  it('does not allow SAP confirmation, draft composition, update or deletion for hidden rows', async () => {
    await request(app.getHttpServer())
      .post('/warehouse-receipt-items/2/sap-confirmation')
      .expect(404);
    await request(app.getHttpServer())
      .put('/warehouse-receipt-items/2/sampling-request-draft')
      .send({ location: 'Kho NL Thuốc' })
      .expect(404);
    await request(app.getHttpServer())
      .patch('/warehouse-receipt-items/2')
      .send({ note: 'hidden' })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/warehouse-receipt-items/2')
      .expect(404);
  });
  it('limits own raw drafts to readable source rows without hiding own finished drafts', async () => {
    const result = await request(app.getHttpServer())
      .get('/sampling-request-drafts?page=1&limit=20')
      .expect(200);
    expect(result.body.data.map((row) => row.id)).toEqual([1, 3]);
    expect(result.body.total).toBe(2);
  });
  it('denies users without either receipt permission while preserving their finished draft workflow', async () => {
    permissions = [];
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items')
      .expect(403);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1')
      .expect(403);
    await request(app.getHttpServer())
      .get('/warehouse-receipt-items/1/attachments')
      .expect(403);
    await request(app.getHttpServer())
      .post('/warehouse-receipt-sampling-drafts/send')
      .send({ requestId: '87c9ad62-d469-44b5-bbdf-8bc074d09c74' })
      .expect(403);
    expect(sender.send).not.toHaveBeenCalled();
    const result = await request(app.getHttpServer())
      .get('/sampling-request-drafts?page=1&limit=20')
      .expect(200);
    expect(result.body.data.map((row) => row.id)).toEqual([3]);
  });
});
