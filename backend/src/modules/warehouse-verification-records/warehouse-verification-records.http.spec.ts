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
const detailPayload = {
  verified_quantity: '12.75',
  defect_description: 'Seal bị rách',
  defect_quantity: '2.5',
  defect_type: 'QUALITY',
  proposed_action: 'Cách ly',
};
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
    users: { findMany: jest.fn(), count: jest.fn() },
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
    warehouseVerificationRecordDetails: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

  it('searches participant options by name or username using a limited projection', async () => {
    const user = { id: 7, name: 'Nguyễn Văn A', username: 'van-a' };
    prisma.users.findMany.mockResolvedValue([user]);
    prisma.users.count.mockResolvedValue(1);
    await request(app.getHttpServer())
      .get(`${route}/participant-options`)
      .query({ search: '  Văn  ', page: 1, limit: 3 })
      .expect(200, { data: [user], total: 1, page: 1, limit: 3 });
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deleted_at: null,
          OR: [
            { name: { contains: 'Văn' } },
            { username: { contains: 'Văn' } },
          ],
        },
        select: { id: true, name: true, username: true },
        take: 3,
      }),
    );
  });

  it('creates the record and participant links in the same write', async () => {
    prisma.users.count.mockResolvedValue(2);
    prisma.warehouseVerificationRecords.create.mockResolvedValue({ id: 1 });
    await request(app.getHttpServer())
      .post(route)
      .send({
        ...payload,
        warehouse_receipt_item_id: receipt.id,
        participant_user_ids: [7, 10],
      })
      .expect(201);
    expect(prisma.users.count).toHaveBeenCalledWith({
      where: { id: { in: [7, 10] }, deleted_at: null },
    });
    expect(prisma.warehouseVerificationRecords.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participants: {
            createMany: { data: [{ user_id: 7 }, { user_id: 10 }] },
          },
        }),
      }),
    );
  });

  it('rejects duplicate or unavailable participants without consuming a record code', async () => {
    prisma.users.count.mockResolvedValue(1);
    for (const participant_user_ids of [
      [7, 7],
      [7, 10],
    ]) {
      await request(app.getHttpServer())
        .post(route)
        .send({
          ...payload,
          warehouse_receipt_item_id: receipt.id,
          participant_user_ids,
        })
        .expect(400);
    }
    expect(prisma.users.count).toHaveBeenCalledTimes(1);
    expect(
      prisma.warehouseVerificationCodeSequence.update,
    ).not.toHaveBeenCalled();
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

  it('adds details using the parent and signed-in user and includes details in the parent response', async () => {
    const detail = {
      ...detailPayload,
      id: 2,
      verification_record_id: 9,
      created_by_id: 5,
    };
    prisma.warehouseVerificationRecords.findFirst.mockResolvedValue({ id: 9 });
    prisma.warehouseVerificationRecordDetails.create.mockResolvedValue(detail);

    await request(app.getHttpServer())
      .post(`${route}/9/details`)
      .send({ ...detailPayload, verified_quantity: 12.75 })
      .expect(201, detail);
    expect(
      prisma.warehouseVerificationRecordDetails.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ...detailPayload,
          verification_record_id: 9,
          created_by_id: 5,
        }),
      }),
    );
    const record = { id: 9, record_code: 'BMXM00009', details: [detail] };
    prisma.warehouseVerificationRecords.findFirst.mockResolvedValue(record);
    await request(app.getHttpServer()).get(`${route}/9`).expect(200, record);
    expect(
      prisma.warehouseVerificationRecords.findFirst,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          details: expect.objectContaining({ orderBy: { id: 'asc' } }),
        }),
      }),
    );
  });

  it.each([
    { verified_quantity: '0' },
    { defect_quantity: '-1' },
    { defect_quantity: '20' },
    { defect_quantity: '1.0001' },
    { defect_type: 'UNKNOWN' },
    { created_by_id: 99 },
  ])('rejects invalid detail inputs %j', async (invalidFields) => {
    await request(app.getHttpServer())
      .post(`${route}/9/details`)
      .send({ ...detailPayload, ...invalidFields })
      .expect(400);
    expect(
      prisma.warehouseVerificationRecordDetails.create,
    ).not.toHaveBeenCalled();
  });

  it('does not create a detail for an inaccessible parent', async () => {
    prisma.warehouseVerificationRecords.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post(`${route}/9/details`)
      .send(detailPayload)
      .expect(404);
    expect(
      prisma.warehouseVerificationRecordDetails.create,
    ).not.toHaveBeenCalled();
  });

  it('uses saved quantities when validating a partial change and allows clearing a note', async () => {
    const detailsRoute = `${route}/9/details/2`;
    const quantities = {
      verified_quantity: new Prisma.Decimal(12.75),
      defect_quantity: new Prisma.Decimal(2.5),
    };
    prisma.warehouseVerificationRecordDetails.findUnique.mockResolvedValue(
      quantities,
    );
    await request(app.getHttpServer())
      .patch(detailsRoute)
      .send({ verified_quantity: 2 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(detailsRoute)
      .send({ defect_quantity: null })
      .expect(400);
    expect(
      prisma.warehouseVerificationRecordDetails.update,
    ).not.toHaveBeenCalled();

    const patch = { verified_quantity: '3', note: null };
    prisma.warehouseVerificationRecordDetails.update.mockResolvedValue({
      id: 2,
      ...patch,
    });
    await request(app.getHttpServer())
      .patch(detailsRoute)
      .send(patch)
      .expect(200);
    expect(
      prisma.warehouseVerificationRecordDetails.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 2,
          verification_record_id: 9,
          ...quantities,
          verificationRecord: {
            is: {
              OR: [{ warehouseReceiptItem: { is: { entered_by_id: 5 } } }],
            },
          },
        }),
        data: expect.objectContaining(patch),
      }),
    );
  });

  it('deletes only through the specified accessible parent', async () => {
    prisma.warehouseVerificationRecordDetails.delete.mockResolvedValue({
      id: 2,
    });
    await request(app.getHttpServer())
      .delete(`${route}/9/details/2`)
      .expect(204);
    expect(
      prisma.warehouseVerificationRecordDetails.delete,
    ).toHaveBeenCalledWith({
      where: {
        id: 2,
        verification_record_id: 9,
        verificationRecord: {
          is: { OR: [{ warehouseReceiptItem: { is: { entered_by_id: 5 } } }] },
        },
      },
    });
    prisma.warehouseVerificationRecordDetails.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    await request(app.getHttpServer())
      .delete(`${route}/10/details/2`)
      .expect(404);

    prisma.warehouseVerificationRecordDetails.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );
    await request(app.getHttpServer())
      .delete(`${route}/9/details/2`)
      .expect(409);
  });
});
