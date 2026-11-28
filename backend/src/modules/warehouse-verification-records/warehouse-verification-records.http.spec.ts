import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PrismaService } from 'src/prisma.service';
import { WarehouseVerificationRecordsModule } from './warehouse-verification-records.module';

const route = '/warehouse-verification-records';
const payload = { location: 'Kho A' };
const receipt = {
  id: 8,
  item_code: 'NL-01',
  lot_number: 'LOT-01',
  received_at: '2026-11-28T01:00:00.000Z',
  item: { item_name: 'Nguyên liệu A' },
};

describe('Warehouse verification records HTTP API', () => {
  let app: INestApplication;
  const prisma = {
    userApplications: { findFirst: jest.fn() },
    warehouseReceiptItems: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    productionOrders: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    warehouseVerificationCodeSequence: { update: jest.fn() },
    warehouseVerificationRecords: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: (
      queries: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    ): Promise<unknown> =>
      Array.isArray(queries) ? Promise.all(queries) : queries(prisma),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [WarehouseVerificationRecordsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(jwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 5,
            permissions: [
              'warehouse-receipt-items.read-own',
              ...(req.headers['x-test-orders']
                ? ['production-orders.list']
                : []),
            ],
          };
          return true;
        },
      })
      .overrideGuard(NetworkPolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.userApplications.findFirst.mockResolvedValue({ id: 1 });
    prisma.warehouseVerificationCodeSequence.update.mockResolvedValue({
      last_number: 1n,
    });
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      id: receipt.id,
    });
  });

  afterAll(() => app.close());

  it.each([
    [1n, 'BMXM00001'],
    [37n, 'BMXM00037'],
    [100000n, 'BMXM100000'],
  ])(
    'creates with the authenticated creator and formats sequence %s as %s',
    async (last_number, record_code) => {
      prisma.warehouseVerificationCodeSequence.update.mockResolvedValue({
        last_number,
      });
      const record = { id: 1, ...payload, record_code };
      prisma.warehouseVerificationRecords.create.mockResolvedValue(record);
      await request(app.getHttpServer())
        .post(route)
        .send({
          location: '  Kho A  ',
          warehouse_receipt_item_id: receipt.id,
        })
        .expect(201, record);
      expect(prisma.warehouseReceiptItems.findUnique).toHaveBeenCalledWith({
        where: { id: receipt.id },
        select: { id: true },
      });
      expect(
        prisma.warehouseVerificationCodeSequence.update,
      ).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { last_number: { increment: 1n } },
      });
      expect(prisma.warehouseVerificationRecords.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            ...payload,
            record_code,
            created_by_id: 5,
            warehouse_receipt_item_id: receipt.id,
            production_order_id: null,
          },
        }),
      );
    },
  );

  it.each([
    payload,
    { ...payload, warehouse_receipt_item_id: 8, production_order_id: 7 },
    { ...payload, warehouse_receipt_item_id: 8, created_by_id: 99 },
    { ...payload, warehouse_receipt_item_id: 8, record_code: 'BMXM00300' },
  ])('rejects invalid create payload %#', async (body) => {
    await request(app.getHttpServer()).post(route).send(body).expect(400);
    expect(prisma.warehouseVerificationRecords.create).not.toHaveBeenCalled();
  });

  it('returns a conflict if the selected receipt was removed before save', async () => {
    prisma.warehouseVerificationRecords.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );
    await request(app.getHttpServer())
      .post(route)
      .send({ ...payload, warehouse_receipt_item_id: receipt.id })
      .expect(409);
  });

  it('applies receipt visibility to both list and direct detail', async () => {
    const where = {
      OR: [{ warehouseReceiptItem: { is: { entered_by_id: 5 } } }],
    };
    prisma.warehouseVerificationRecords.findMany.mockResolvedValue([]);
    prisma.warehouseVerificationRecords.count.mockResolvedValue(0);
    prisma.warehouseVerificationRecords.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get(route)
      .query({ page: 2, limit: 10 })
      .expect(200, { data: [], page: 2, limit: 10, total: 0 });
    expect(prisma.warehouseVerificationRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 10, take: 10 }),
    );
    expect(prisma.warehouseVerificationRecords.count).toHaveBeenCalledWith({
      where,
    });
    await request(app.getHttpServer()).get(`${route}/9`).expect(404);
    expect(prisma.warehouseVerificationRecords.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ id: 9 }, where] } }),
    );
  });

  it('returns searchable receipts and restricts production lookup and create', async () => {
    prisma.warehouseReceiptItems.findMany.mockResolvedValue([receipt]);
    prisma.warehouseReceiptItems.count.mockResolvedValue(1);
    const result = await request(app.getHttpServer())
      .get(`${route}/subjects`)
      .query({ type: 'receipt', search: '  LOT-01  ' })
      .expect(200);
    expect(result.body.data[0]).toMatchObject({
      id: receipt.id,
      lot_number: receipt.lot_number,
      item_name: receipt.item.item_name,
    });
    expect(prisma.warehouseReceiptItems.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([{ lot_number: { contains: 'LOT-01' } }]),
        },
      }),
    );
    await request(app.getHttpServer())
      .get(`${route}/subjects?type=production_order`)
      .expect(403);
    await request(app.getHttpServer())
      .post(route)
      .send({ ...payload, production_order_id: 7 })
      .expect(403);
    expect(prisma.productionOrders.findMany).not.toHaveBeenCalled();
    expect(prisma.productionOrders.findUnique).not.toHaveBeenCalled();
  });

  it('blocks signed-in users without an active WMS assignment', async () => {
    prisma.userApplications.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get(route).expect(403);
    expect(prisma.warehouseVerificationRecords.findMany).not.toHaveBeenCalled();
  });

  it('searches production codes and creates an order-linked record', async () => {
    const order = {
      id: 17,
      item_code: 'TP-17',
      production_order_code: 'LSX-17',
      lot_no: 'LOT-17',
      creation_date: '2026-11-28T02:00:00.000Z',
      item: { item_name: 'Thành phẩm B' },
    };
    prisma.productionOrders.findMany.mockResolvedValue([order]);
    prisma.productionOrders.count.mockResolvedValue(1);
    const record = {
      id: 3,
      ...payload,
      record_code: 'BMXM00001',
      productionOrder: order,
    };
    prisma.warehouseVerificationRecords.create.mockResolvedValue(record);
    prisma.warehouseVerificationRecords.findFirst.mockResolvedValue(record);

    const response = await request(app.getHttpServer())
      .get(`${route}/subjects`)
      .query({ type: 'production_order', search: 'LSX-17' })
      .set('x-test-orders', 'true')
      .expect(200);
    expect(response.body.data[0]).toMatchObject({
      id: order.id,
      reference: order.production_order_code,
      lot_number: order.lot_no,
    });
    prisma.productionOrders.findUnique.mockResolvedValue({ id: order.id });
    await request(app.getHttpServer())
      .post(route)
      .set('x-test-orders', 'true')
      .send({ ...payload, production_order_id: order.id })
      .expect(201, record);
    expect(prisma.warehouseVerificationRecords.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ...payload,
          record_code: 'BMXM00001',
          created_by_id: 5,
          warehouse_receipt_item_id: null,
          production_order_id: order.id,
        },
      }),
    );
    await request(app.getHttpServer())
      .get(`${route}/3`)
      .set('x-test-orders', 'true')
      .expect(200, record);
  });
});
