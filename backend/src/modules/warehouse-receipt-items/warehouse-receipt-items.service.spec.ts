import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
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
    businessPartners: { findUnique: jest.fn() },
    users: { findFirst: jest.fn() },
  };
  const service = new WarehouseReceiptItemsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.items.findFirst.mockResolvedValue({ item_code: 'NL001' });
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.businessPartners.findUnique.mockResolvedValue({
      card_type: 'cSupplier',
    });
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
      supplier_code: ' NC001 ',
    });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          note: null,
          expiry_date: null,
          supplier_code: 'NC001',
          supplier_name: null,
        },
      }),
    );
  });

  it('creates a receipt with a supplier relation and includes supplier details', async () => {
    await service.create(
      { item_code: 'NL001', lot_number: 'L01', supplier_code: ' NC001 ' },
      { id: 7 },
    );
    expect(prisma.businessPartners.findUnique).toHaveBeenCalledWith({
      where: { card_code: 'NC001' },
      select: { card_type: true },
    });
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplier_code: 'NC001',
          supplier_name: null,
        }),
        include: expect.objectContaining({
          supplier: {
            select: { card_code: true, card_name: true, tax_code: true },
          },
        }),
      }),
    );
  });

  it.each([null, { card_type: 'cCustomer' }, { card_type: 'cLid' }])(
    'rejects missing and non-supplier partners on create/update: %j',
    async (partner) => {
      prisma.businessPartners.findUnique.mockResolvedValue(partner);
      await expect(
        service.create(
          { item_code: 'NL001', lot_number: 'L01', supplier_code: 'KH001' },
          { id: 7 },
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { supplier_code: 'KH001' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
      expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
    },
  );

  it.each([null, ''])(
    'clears the relation and legacy name for supplier_code %j',
    async (supplier_code) => {
      await service.update(1, { supplier_code });
      expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { supplier_code: null, supplier_name: null },
        }),
      );
      expect(prisma.businessPartners.findUnique).not.toHaveBeenCalled();
    },
  );

  it('preserves the existing supplier when updating unrelated fields', async () => {
    await service.update(1, { note: 'Checked' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { note: 'Checked' } }),
    );
    expect(prisma.businessPartners.findUnique).not.toHaveBeenCalled();
  });

  it.each([123, 'A'.repeat(192), '   '])(
    'rejects invalid supplier codes %j',
    async (supplier_code) => {
      await expect(
        service.update(1, { supplier_code } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
    },
  );

  it('rejects free-text supplier names in new write requests', async () => {
    await expect(
      service.update(1, { supplier_name: 'Free text' } as never),
    ).rejects.toThrow('Unknown field: supplier_name');
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

  it.each([125.5, ' 125.500 '])(
    'stores quantity %j as a decimal and trims the unit',
    async (quantity) => {
      await service.create(
        { item_code: 'NL001', lot_number: 'L01', quantity, unit: ' kg ' },
        { id: 7 },
      );
      expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: new Prisma.Decimal('125.5'),
            unit: 'kg',
          }),
        }),
      );
    },
  );

  it.each([
    0,
    -1,
    '',
    ' ',
    'abc',
    '1.2345',
    '1e3',
    '1000000000',
    Infinity,
    NaN,
    true,
    {},
  ])('rejects invalid quantity %j on create and update', async (quantity) => {
    await expect(
      service.create(
        { item_code: 'NL001', lot_number: 'L01', quantity } as never,
        { id: 7 },
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(service.update(1, { quantity } as never)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
    expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
  });

  it.each(['0.001', '999999999.999'])(
    'accepts the quantity boundary %s',
    async (quantity) => {
      await service.update(1, { quantity });
      expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: new Prisma.Decimal(quantity) },
        }),
      );
    },
  );

  it('allows clearing quantity and unit', async () => {
    await service.update(1, { quantity: null, unit: '' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { quantity: null, unit: null },
      }),
    );
  });

  it.each([123, 'A'.repeat(192)])('rejects invalid units %j', async (unit) => {
    await expect(service.update(1, { unit } as never)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
  });

  it('updates the unit without overwriting the quantity', async () => {
    await service.update(1, { unit: ' thùng ' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { unit: 'thùng' } }),
    );
  });
});
