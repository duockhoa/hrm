import { ConflictException, NotFoundException } from '@nestjs/common';
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
    warehouseReceiptItems: { findUnique: jest.fn() },
    warehouseReceiptItemSamplingRequestDrafts: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
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

  it('copies the receipt fields from the server and trims the sample location', async () => {
    const saved = { id: 7, warehouse_receipt_item_id: 2 };
    prisma.warehouseReceiptItemSamplingRequestDrafts.upsert.mockResolvedValue(
      saved,
    );
    await expect(
      service.save(2, { location: '  Warehouse A  ' }),
    ).resolves.toEqual(saved);
    const data = {
      item_code: 'NL001',
      item_name: 'Material',
      quantity: receipt.quantity,
      unit: 'kg',
      supplier_name: 'Current supplier',
      lot_number: 'LOT001',
      expiry_date: receipt.expiry_date,
      location: 'Warehouse A',
    };
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.upsert,
    ).toHaveBeenCalledWith({
      where: { warehouse_receipt_item_id: 2 },
      create: { warehouse_receipt_item_id: 2, ...data },
      update: data,
    });
  });

  it('upserts the same receipt when the draft is composed again', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.upsert.mockResolvedValue({
      id: 7,
    });
    await service.save(2, { location: 'A' });
    await service.save(2, { location: 'B' });
    for (const [query] of prisma.warehouseReceiptItemSamplingRequestDrafts
      .upsert.mock.calls) {
      expect(query.where).toEqual({ warehouse_receipt_item_id: 2 });
    }
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.upsert.mock.calls[1][0]
        .update.location,
    ).toBe('B');
  });

  it('falls back to the stored supplier name', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      ...receipt,
      supplier: null,
    });
    await service.save(2, { location: 'A' });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ supplier_name: 'Old supplier' }),
      }),
    );
  });

  it('rejects missing receipts without writing a draft', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue(null);
    await expect(service.save(99, { location: 'A' })).rejects.toThrow(
      NotFoundException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.upsert,
    ).not.toHaveBeenCalled();
  });

  it('does not recompose a request that has already been sent', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      ...receipt,
      samplingRequest: { id: 1 },
    });
    await expect(service.save(2, { location: 'A' })).rejects.toThrow(
      ConflictException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.upsert,
    ).not.toHaveBeenCalled();
  });

  it('returns null when a receipt has no draft', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique.mockResolvedValue(
      null,
    );
    await expect(service.findByReceipt(2)).resolves.toBeNull();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique,
    ).toHaveBeenCalledWith({ where: { warehouse_receipt_item_id: 2 } });
  });

  it('paginates and counts the same search without mixing item filters', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      [{ id: 7 }],
    );
    prisma.warehouseReceiptItemSamplingRequestDrafts.count.mockResolvedValue(
      301,
    );
    await expect(
      service.findAll({
        search: 'Kho_A%',
        item_code: 'NL001',
        page: 2,
        limit: 300,
      }),
    ).resolves.toEqual({ data: [{ id: 7 }], total: 301, page: 2, limit: 300 });
    const query =
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mock
        .calls[0][0];
    expect(query).toMatchObject({
      where: { item_code: 'NL001' },
      skip: 300,
      take: 300,
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(query.where.AND[0].OR).toContainEqual({
      location: { contains: 'Kho\\_A\\%' },
    });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.count,
    ).toHaveBeenCalledWith({ where: query.where });
  });
});
