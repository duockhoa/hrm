import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptSamplingDraftsService } from './warehouse-receipt-sampling-drafts.service';

describe('WarehouseReceiptSamplingDraftsService', () => {
  const receipt = {
    id: 2,
    item_code: 'NL001',
    quantity: new Prisma.Decimal('125.125'),
    unit: 'kg',
    lot_number: 'LOT001',
    expiry_date: new Date('2027-12-31'),
    supplier_name: 'Old supplier',
    item: { item_name: 'Material' },
    supplier: { card_name: 'Current supplier' },
    samplingRequest: null,
  };
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    warehouseReceiptSamplingSendBatches: { findUnique: jest.fn() },
    warehouseReceiptItems: { findUnique: jest.fn() },
    productionOrders: { findUnique: jest.fn() },
    warehouseReceiptItemSamplingRequestDrafts: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new WarehouseReceiptSamplingDraftsService(
    prisma as unknown as PrismaService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue(receipt);
  });

  it('copies finished order data into a private draft with only a location supplied', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 21,
      item_code: 'TP001',
      item: { item_name: 'Finished product' },
      description: 'Order',
      planned_quatity: 1200,
      unit: 'H?p',
      lot_no: 'LOT-TP',
      expire_date: '12/2028',
      finishedProductSummaries: [{ id: 1 }],
    });
    await service.saveProductionOrder(21, { location: '  A1  ' }, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        production_order_id: 21,
        created_by_id: 5,
        request_type: 'TP',
        item_code: 'TP001',
        item_name: 'Finished product',
        quantity: new Prisma.Decimal(1200),
        unit: 'H?p',
        lot_number: 'LOT-TP',
        expiry_date: null,
        expiry_date_text: '12/2028',
        location: 'A1',
      }),
    });
  });
  it('refuses to overwrite a finished draft owned by another user', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique.mockResolvedValue(
      { id: 7, created_by_id: 6 },
    );
    await expect(
      service.saveProductionOrder(21, { location: 'A' }, 5),
    ).rejects.toThrow(ForbiddenException);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.update,
    ).not.toHaveBeenCalled();
  });
  it('limits finished draft reads to the owner and request type', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({ id: 21 });
    await service.findByProductionOrder(21, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findFirst,
    ).toHaveBeenCalledWith({
      where: { production_order_id: 21, created_by_id: 5, request_type: 'TP' },
    });
  });
  it('requires a finished product summary before composing', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      id: 21,
      item_code: 'TP001',
      finishedProductSummaries: [],
    });
    await expect(
      service.saveProductionOrder(21, { location: 'A' }, 5),
    ).rejects.toThrow('Chỉ soạn PYCLM');
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).not.toHaveBeenCalled();
  });

  it('copies receipt fields and stamps the authenticated creator', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.create.mockResolvedValue({
      id: 7,
      created_by_id: 5,
    });
    await expect(service.save(2, { location: '  A  ' }, 5)).resolves.toEqual({
      id: 7,
      created_by_id: 5,
    });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).toHaveBeenCalledWith({
      data: {
        warehouse_receipt_item_id: 2,
        created_by_id: 5,
        item_code: 'NL001',
        item_name: 'Material',
        quantity: receipt.quantity,
        unit: 'kg',
        supplier_name: 'Current supplier',
        lot_number: 'LOT001',
        expiry_date: receipt.expiry_date,
        location: 'A',
      },
    });
  });

  it('updates only a draft owned by the same user', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique.mockResolvedValue(
      { id: 7, created_by_id: 5 },
    );
    await service.save(2, { location: 'B' }, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { warehouse_receipt_item_id: 2, created_by_id: 5 },
        data: expect.objectContaining({ location: 'B' }),
      }),
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).not.toHaveBeenCalled();
  });

  it.each([6, null])(
    'never overwrites another or unassigned creator %p',
    async (owner) => {
      prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique.mockResolvedValue(
        { id: 7, created_by_id: owner },
      );
      await expect(service.save(2, { location: 'B' }, 5)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        prisma.warehouseReceiptItemSamplingRequestDrafts.update,
      ).not.toHaveBeenCalled();
      expect(
        prisma.warehouseReceiptItemSamplingRequestDrafts.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects a different user winning the concurrent unique-receipt insert', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 7, created_by_id: 6 });
    prisma.warehouseReceiptItemSamplingRequestDrafts.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(service.save(2, { location: 'B' }, 5)).rejects.toThrow(
      ForbiddenException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.update,
    ).not.toHaveBeenCalled();
  });

  it('can finish a concurrent insert from the same creator', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 7, created_by_id: 5 });
    prisma.warehouseReceiptItemSamplingRequestDrafts.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await service.save(2, { location: 'B' }, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { warehouse_receipt_item_id: 2, created_by_id: 5 },
      }),
    );
  });

  it('blocks edits during this users active send', async () => {
    prisma.warehouseReceiptSamplingSendBatches.findUnique.mockResolvedValue({
      status: 'sending',
    });
    await expect(service.save(2, { location: 'B' }, 5)).rejects.toThrow(
      ConflictException,
    );
    expect(
      prisma.warehouseReceiptSamplingSendBatches.findUnique,
    ).toHaveBeenCalledWith({
      where: { active_key: 'warehouse-receipt-sampling:5' },
    });
  });

  it('falls back to the stored supplier name', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      ...receipt,
      supplier: null,
    });
    await service.save(2, { location: 'A' }, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supplier_name: 'Old supplier' }),
      }),
    );
  });

  it('rejects missing receipts without creating drafts', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValueOnce(null);
    await expect(service.save(99, { location: 'A' }, 5)).rejects.toThrow(
      NotFoundException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).not.toHaveBeenCalled();
  });

  it('creates a new draft for a receipt that has already sent a sampling request', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      ...receipt,
      samplingRequest: { id: 1 },
    });
    await service.save(2, { location: 'New location' }, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        warehouse_receipt_item_id: 2,
        created_by_id: 5,
        location: 'New location',
        item_code: receipt.item_code,
      }),
    });
  });

  it('reads a receipt draft only within the authenticated creators scope', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findFirst.mockResolvedValue(
      null,
    );
    await expect(service.findByReceipt(2, 5)).resolves.toBeNull();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        warehouse_receipt_item_id: 2,
        created_by_id: 5,
        request_type: 'NL',
      },
    });
  });

  it('scopes both paginated rows and total to the same creator and search', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      [{ id: 7 }],
    );
    prisma.warehouseReceiptItemSamplingRequestDrafts.count.mockResolvedValue(
      301,
    );
    await expect(
      service.findAll(
        { search: 'Kho_A%', item_code: 'NL001', page: 2, limit: 300 },
        5,
      ),
    ).resolves.toEqual({ data: [{ id: 7 }], total: 301, page: 2, limit: 300 });
    const query =
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mock
        .calls[0][0];
    expect(query).toMatchObject({
      where: { created_by_id: 5, item_code: 'NL001' },
      skip: 300,
      take: 300,
    });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.count,
    ).toHaveBeenCalledWith({ where: query.where });
  });

  it('combines both request types in one owner-scoped paginated query and normalizes the finished supplier', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      [
        { id: 1, request_type: 'NL', supplier_name: 'Material supplier' },
        { id: 2, request_type: 'TP', supplier_name: 'Old supplier' },
      ],
    );
    prisma.warehouseReceiptItemSamplingRequestDrafts.count.mockResolvedValue(2);
    const result = await service.findAll({ page: 1, limit: 20 }, 5, 'ALL');
    expect(result).toMatchObject({
      data: [
        { id: 1, supplier_name: 'Material supplier' },
        { id: 2, supplier_name: 'Cty CP Dược Khoa' },
      ],
      total: 2,
    });
    const query =
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mock
        .calls[0][0];
    expect(query.where.created_by_id).toBe(5);
    expect(query.where).not.toHaveProperty('request_type');
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.count,
    ).toHaveBeenCalledWith({ where: query.where });
  });

  it('returns only the pending types of the current user', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      [{ request_type: 'NL' }, { request_type: 'TP' }],
    );
    await expect(service.pendingTypes(5)).resolves.toEqual(['NL', 'TP']);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany,
    ).toHaveBeenCalledWith({
      where: { created_by_id: 5 },
      select: { request_type: true },
      distinct: ['request_type'],
    });
  });

  it.each([0, NaN, -1])(
    'rejects invalid authenticated user %p before querying private drafts',
    async (userId) => {
      await expect(service.findAll({}, userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.findByReceipt(2, userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.save(2, { location: 'A' }, userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(
        prisma.warehouseReceiptItemSamplingRequestDrafts.findMany,
      ).not.toHaveBeenCalled();
    },
  );
});
