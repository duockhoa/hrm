import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

describe('WarehouseReceiptItemsService', () => {
  const prisma = {
    warehouseReceiptItems: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    items: { findFirst: jest.fn() },
    users: { findFirst: jest.fn() },
  };
  const service = new WarehouseReceiptItemsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.items.findFirst.mockResolvedValue({ item_code: 'NL001' });
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({ id: 1 });
  });

  it('creates using the authenticated user, trims text and preserves date-only expiry', async () => {
    await service.create(
      {
        item_code: ' NL001 ',
        lot_number: ' L01 ',
        expiry_date: '2028-02-29',
        received_at: '2026-10-01T08:00:00+07:00',
        note: '  ',
      },
      { id: 7 },
    );
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          item_code: 'NL001',
          lot_number: 'L01',
          note: null,
          entered_by_id: 7,
          expiry_date: new Date('2028-02-29T00:00:00.000Z'),
          received_at: new Date('2026-10-01T01:00:00.000Z'),
        },
      }),
    );
  });

  it.each(['2026-02-29', '2026-04-31', '31/12/2027', '', '0001-01-01'])(
    'rejects invalid expiry %s before writing',
    async (expiry_date) => {
      await expect(
        service.create(
          { item_code: 'NL001', lot_number: 'L01', expiry_date },
          { id: 7 },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
    },
  );

  it.each(['2026-10-01', '2026-10-01T08:00:00', '2026-02-30T08:00:00Z'])(
    'rejects ambiguous or invalid received_at %s',
    async (received_at) => {
      await expect(
        service.create(
          { item_code: 'NL001', lot_number: 'L01', received_at },
          { id: 7 },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('rejects an unknown/deleted item', async () => {
    prisma.items.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ item_code: 'missing', lot_number: 'L01' }, { id: 7 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
  });

  it('rejects missing authentication and deleted users', async () => {
    await expect(
      service.create({ item_code: 'NL001', lot_number: 'L01' }),
    ).rejects.toThrow(UnauthorizedException);
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ item_code: 'NL001', lot_number: 'L01' }, { id: 7 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('prevents clients from overriding the person who entered the receipt', async () => {
    const body = { item_code: 'NL001', lot_number: 'L01', entered_by_id: 99 };
    await expect(service.create(body, { id: 7 })).rejects.toThrow(
      'Unknown field: entered_by_id',
    );
    await expect(service.update(1, body)).rejects.toThrow(
      'Unknown field: entered_by_id',
    );
  });

  it('partially updates and clears optional fields without changing the creator', async () => {
    await service.update(1, {
      note: null,
      expiry_date: null,
      supplier_name: ' New supplier ',
    });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { note: null, expiry_date: null, supplier_name: 'New supplier' },
      }),
    );
  });

  it('rejects empty updates, null required fields and excessively long text', async () => {
    await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
    await expect(
      service.update(1, { lot_number: null } as never),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(1, { lot_number: 'x'.repeat(101) }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
  });

  it('returns 404 for reads, updates and deletes of missing receipts', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue(null);
    await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    await expect(service.update(1, { note: 'test' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.delete(1)).rejects.toThrow(NotFoundException);
    expect(prisma.warehouseReceiptItems.delete).not.toHaveBeenCalled();
  });

  it('deletes an existing receipt', async () => {
    await service.delete(1);
    expect(prisma.warehouseReceiptItems.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });
});
