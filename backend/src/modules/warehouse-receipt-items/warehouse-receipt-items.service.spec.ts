import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { removeReceiptAttachments } from './receipt-attachment-files';

jest.mock('./receipt-attachment-files', () => ({
  removeReceiptAttachments: jest.fn(),
}));
import { WarehouseReceiptItemsService } from './warehouse-receipt-items.service';

describe('WarehouseReceiptItemsService', () => {
  const validCreateDto = {
    item_code: 'NL001',
    lot_number: 'L01',
    quantity: '1',
    supplier_code: 'NC001',
  };
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    warehouseReceiptItems: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    items: { findFirst: jest.fn() },
    businessPartners: { findUnique: jest.fn() },
    manufacturers: { findUnique: jest.fn() },
    users: { findFirst: jest.fn() },
  };
  const service = new WarehouseReceiptItemsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: 1 }]);
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'NL001',
      unit: 'kg',
    });
    prisma.users.findFirst.mockResolvedValue({ id: 7 });
    prisma.businessPartners.findUnique.mockResolvedValue({
      card_type: 'cSupplier',
    });
    prisma.manufacturers.findUnique.mockResolvedValue({
      manufacturer_code: 'NSX0001',
    });
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({ id: 1 });
  });

  it.each(['quantity', 'supplier_code'] as const)(
    'requires %s when creating a receipt',
    async (field) => {
      const body: Partial<typeof validCreateDto> = { ...validCreateDto };
      delete body[field];
      await expect(service.create(body as never, { id: 7 })).rejects.toThrow(
        field + ' is required',
      );
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
    },
  );

  it('creates using the authenticated user, trims text and preserves date-only expiry', async () => {
    await service.create(
      {
        ...validCreateDto,
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
          quantity: new Prisma.Decimal('1'),
          supplier_code: 'NC001',
          supplier_name: null,
          unit: 'kg',
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
        service.create({ ...validCreateDto, expiry_date }, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
    },
  );

  it.each(['2026-10-01', '2026-10-01T08:00:00', '2026-02-30T08:00:00Z'])(
    'rejects ambiguous or invalid received_at %s',
    async (received_at) => {
      await expect(
        service.create({ ...validCreateDto, received_at }, { id: 7 }),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('rejects an unknown/deleted item', async () => {
    prisma.items.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ ...validCreateDto, item_code: 'missing' }, { id: 7 }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
  });

  it('rejects missing authentication and deleted users', async () => {
    await expect(service.create({ ...validCreateDto })).rejects.toThrow(
      UnauthorizedException,
    );
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ ...validCreateDto }, { id: 7 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('prevents clients from overriding the person who entered the receipt', async () => {
    const body = { ...validCreateDto, entered_by_id: 99 };
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
      { ...validCreateDto, supplier_code: ' NC001 ' },
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
          { ...validCreateDto, supplier_code: 'KH001' },
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

  it.each([null, '', '   '])(
    'rejects empty supplier_code %j on create and update',
    async (supplier_code) => {
      await expect(
        service.create({ ...validCreateDto, supplier_code } as never, {
          id: 7,
        }),
      ).rejects.toThrow('supplier_code is required');
      await expect(
        service.update(1, { supplier_code } as never),
      ).rejects.toThrow('supplier_code is required');
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
      expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
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

  it('creates a receipt linked to the selected manufacturer', async () => {
    await service.create(
      { ...validCreateDto, manufacturer_code: ' NSX0001 ' },
      { id: 7 },
    );
    expect(prisma.manufacturers.findUnique).toHaveBeenCalledWith({
      where: { manufacturer_code: 'NSX0001' },
      select: { manufacturer_code: true },
    });
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          manufacturer_code: 'NSX0001',
          manufacturer_name: null,
        }),
        include: expect.objectContaining({
          manufacturer: {
            select: { manufacturer_code: true, manufacturer_name: true },
          },
        }),
      }),
    );
  });

  it('updates the manufacturer and replaces the legacy name', async () => {
    await service.update(1, { manufacturer_code: ' NSX0001 ' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { manufacturer_code: 'NSX0001', manufacturer_name: null },
      }),
    );
  });

  it('rejects nonexistent manufacturers on create and update', async () => {
    prisma.manufacturers.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        { ...validCreateDto, manufacturer_code: 'NSX9999' },
        { id: 7 },
      ),
    ).rejects.toThrow('Manufacturer does not exist');
    await expect(
      service.update(1, { manufacturer_code: 'NSX9999' }),
    ).rejects.toThrow('Manufacturer does not exist');
    expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
    expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
  });

  it.each([123, 'A'.repeat(101), '   '])(
    'rejects invalid manufacturer codes %j',
    async (manufacturer_code) => {
      await expect(
        service.create({ ...validCreateDto, manufacturer_code } as never, {
          id: 7,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { manufacturer_code } as never),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.warehouseReceiptItems.create).not.toHaveBeenCalled();
      expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
    },
  );

  it.each([null, ''])(
    'allows clearing the optional manufacturer using %j',
    async (manufacturer_code) => {
      await service.update(1, { manufacturer_code });
      expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { manufacturer_code: null, manufacturer_name: null },
        }),
      );
      expect(prisma.manufacturers.findUnique).not.toHaveBeenCalled();
    },
  );

  it('preserves the manufacturer when it is omitted', async () => {
    await service.create(validCreateDto, { id: 7 });
    const createCalls = prisma.warehouseReceiptItems.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    const createArgs = createCalls[0][0];
    expect(createArgs.data).not.toHaveProperty('manufacturer_code');
    await service.update(1, { note: 'Checked' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { note: 'Checked' } }),
    );
    expect(prisma.manufacturers.findUnique).not.toHaveBeenCalled();
  });

  it('rejects free-text manufacturer names in write requests', async () => {
    await expect(
      service.create(
        { ...validCreateDto, manufacturer_name: 'Free text' } as never,
        { id: 7 },
      ),
    ).rejects.toThrow('Unknown field: manufacturer_name');
    await expect(
      service.update(1, { manufacturer_name: 'Free text' } as never),
    ).rejects.toThrow('Unknown field: manufacturer_name');
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
    prisma.warehouseReceiptItems.delete.mockResolvedValue({
      id: 1,
      attachments: [{ file_path: '/test/image.jpg' }],
    });
    await service.delete(1);
    expect(removeReceiptAttachments).toHaveBeenCalledWith(['/test/image.jpg']);
    expect(prisma.warehouseReceiptItems.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it.each([125.5, ' 125.500 '])(
    'stores quantity %j as a decimal and trims the unit',
    async (quantity) => {
      await service.create(
        { ...validCreateDto, quantity, unit: ' kg ' },
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
    null,
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
      service.create({ ...validCreateDto, quantity } as never, { id: 7 }),
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

  it('allows clearing the optional unit', async () => {
    await service.update(1, { unit: '' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unit: null },
      }),
    );
  });

  it.each([123, 'A'.repeat(192)])('rejects invalid units %j', async (unit) => {
    await expect(service.update(1, { unit } as never)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.warehouseReceiptItems.update).not.toHaveBeenCalled();
  });

  it('defaults the unit from the item when creating without a unit', async () => {
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'NL001',
      unit: ' kg ',
    });
    await service.create({ ...validCreateDto }, { id: 7 });
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: 'kg' }),
      }),
    );
  });

  it.each([null, ''])(
    'preserves an explicitly cleared unit on create: %j',
    async (unit) => {
      await service.create({ ...validCreateDto, unit }, { id: 7 });
      expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ unit: null }),
        }),
      );
    },
  );

  it('preserves an explicit unit override on create', async () => {
    await service.create({ ...validCreateDto, unit: 'thùng' }, { id: 7 });
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: 'thùng' }),
      }),
    );
  });

  it('uses null when the selected item has no unit', async () => {
    prisma.items.findFirst.mockResolvedValue({
      item_code: 'NL001',
      unit: null,
    });
    await service.create({ ...validCreateDto }, { id: 7 });
    expect(prisma.warehouseReceiptItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: null }),
      }),
    );
  });

  it('defaults to the new item unit when changing the item without a unit', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      id: 1,
      item_code: 'NL001',
      unit: 'thùng',
    });
    prisma.items.findFirst.mockResolvedValue({ item_code: 'NL002', unit: 'g' });
    await service.update(1, { item_code: 'NL002' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { item_code: 'NL002', unit: 'g' } }),
    );
  });

  it('preserves the saved unit when the same item code is submitted again', async () => {
    prisma.warehouseReceiptItems.findUnique.mockResolvedValue({
      id: 1,
      item_code: 'NL001',
      unit: 'thùng',
    });
    await service.update(1, { item_code: 'NL001' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { item_code: 'NL001' } }),
    );
  });

  it('preserves an explicit unit when changing the item', async () => {
    await service.update(1, { item_code: 'NL002', unit: 'thùng' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { item_code: 'NL002', unit: 'thùng' } }),
    );
  });

  it('updates the unit without overwriting the quantity', async () => {
    await service.update(1, { unit: ' thùng ' });
    expect(prisma.warehouseReceiptItems.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { unit: 'thùng' } }),
    );
  });
});
