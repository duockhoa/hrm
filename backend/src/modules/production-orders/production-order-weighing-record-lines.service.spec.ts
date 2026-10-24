import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { productionOrderModelWhere } from 'src/access/production-order-scope.extension';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';

describe('ProductionOrderWeighingRecordLinesService', () => {
  let service: ProductionOrderWeighingRecordLinesService;
  let prisma: any;
  const dto = {
    item_code: 'NL001',
    item_name: 'Nguyen lieu',
    planned_quantity: '12.345678',
    unit: 'kg',
  };
  const parent = {
    id: 3,
    status: 'draft',
    qa_staff_approved_at: null,
    ipc_staff_approved_at: null,
  };
  beforeEach(() => {
    prisma = {
      productionOrderWeighingRecords: {
        findUnique: jest.fn().mockResolvedValue(parent),
        update: jest.fn().mockResolvedValue({ id: 3 }),
      },
      productionOrderWeighingRecordLines: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.id === 7 && where.production_order_weighing_record_id === 3
              ? { id: 7, production_order_weighing_record_id: 3 }
              : null,
          ),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ id: 7, ...data })),
        update: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ id: 7, ...data })),
        delete: jest.fn().mockResolvedValue({ id: 7 }),
      },
    };
    prisma.$transaction = jest.fn(async (action) => action(prisma));
    service = new ProductionOrderWeighingRecordLinesService(
      prisma as PrismaService,
    );
  });

  it('saves a decimal precisely and associates it with the URL parent', async () => {
    const result = await service.create(3, {
      ...dto,
      source_line_number: 0,
      source_stage_id: null,
      stage_name: ' Can ',
      note: '  ',
    });
    expect(result.planned_quantity.toString()).toBe('12.345678');
    expect(result).toMatchObject({
      production_order_weighing_record_id: 3,
      source_line_number: 0,
      source_stage_id: null,
      stage_name: 'Can',
      note: null,
    });
    expect(result).not.toHaveProperty('line_order');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.productionOrderWeighingRecords.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 3,
          status: 'draft',
          qa_staff_approved_at: null,
          ipc_staff_approved_at: null,
        },
      }),
    );
    expect(
      prisma.productionOrderWeighingRecords.update.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.productionOrderWeighingRecordLines.create.mock
        .invocationCallOrder[0],
    );
  });

  it.each([
    0,
    -1,
    null,
    true,
    'NaN',
    '1e3',
    '0.0000001',
    '1000000000000',
    '12.1234567',
    '',
  ])('rejects invalid or out-of-range quantity %j', async (quantity) => {
    await expect(
      service.create(3, { ...dto, planned_quantity: quantity } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts the maximum Decimal(18,6) without rounding', async () => {
    const result = await service.create(3, {
      ...dto,
      planned_quantity: '999999999999.999999',
    });
    expect(result.planned_quantity.toString()).toBe('999999999999.999999');
  });

  it.each([
    { line_order: 1 },
    { production_order_weighing_record_id: 4 },
    { item_code: '' },
    { item_name: null },
    { unit: 'x'.repeat(51) },
    { source_line_number: -1 },
    { source_stage_id: 2147483648 },
    { source_stage_id: '2' },
    { note: 'a'.repeat(65536) },
  ])('rejects unknown fields and invalid values %j', async (fields) => {
    await expect(
      service.create(3, { ...dto, ...fields } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires all material fields on create and at least one field on patch', async () => {
    await expect(service.create(3, {} as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.update(3, 7, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists only this record sorted by item code then id', async () => {
    await service.findAll(3);
    expect(
      prisma.productionOrderWeighingRecordLines.findMany,
    ).toHaveBeenCalledWith({
      where: { production_order_weighing_record_id: 3 },
      orderBy: [{ item_code: 'asc' }, { id: 'asc' }],
    });
  });

  it('returns 404 for a missing or hidden parent', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue(null);
    await expect(service.findAll(3)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.create(3, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
  });

  it('does not read or mutate a line through a different parent', async () => {
    await expect(service.findById(4, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(4, 7, { note: 'changed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete(4, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prisma.productionOrderWeighingRecordLines.update,
    ).not.toHaveBeenCalled();
    expect(
      prisma.productionOrderWeighingRecordLines.delete,
    ).not.toHaveBeenCalled();
  });

  it('updates only supplied fields and allows clearing nullable snapshot fields', async () => {
    await service.update(3, 7, { lot_no: null, note: ' checked ' });
    expect(
      prisma.productionOrderWeighingRecordLines.update,
    ).toHaveBeenCalledWith({
      where: { id: 7, production_order_weighing_record_id: 3 },
      data: { lot_no: null, note: 'checked' },
    });
    await service.delete(3, 7);
    expect(
      prisma.productionOrderWeighingRecordLines.delete,
    ).toHaveBeenCalledWith({
      where: { id: 7, production_order_weighing_record_id: 3 },
    });
  });

  it.each([
    { status: 'approved' },
    { qa_staff_approved_at: new Date() },
    { ipc_staff_approved_at: new Date() },
  ])('blocks every child mutation after approval %j', async (approval) => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...parent,
      ...approval,
    });
    await expect(service.create(3, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.update(3, 7, { note: 'changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.delete(3, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.productionOrderWeighingRecords.update).not.toHaveBeenCalled();
  });

  it('rejects a signature racing a child mutation before writing the child', async () => {
    prisma.productionOrderWeighingRecords.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('changed', {
        code: 'P2025',
        clientVersion: '6',
      }),
    );
    await expect(service.create(3, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
  });

  it('inherits visibility through the weighing record parent', () => {
    expect(
      productionOrderModelWhere('ProductionOrderWeighingRecordLines', [42]),
    ).toEqual({
      weighingRecord: { is: { production_order_id: { in: [42] } } },
    });
  });

  it('imports all lines atomically without changing their lots', async () => {
    const result = await service.importStage(3, 2, [
      { ...dto, lot_no: 'LOT-A' },
      { ...dto, lot_no: 'LOT-B' },
    ]);
    expect(result.map((row) => row.lot_no)).toEqual(['LOT-A', 'LOT-B']);
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'ReadCommitted' }),
    );
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).toHaveBeenCalledTimes(2);
  });

  it('rejects a repeated stage import while holding the parent lock', async () => {
    prisma.productionOrderWeighingRecordLines.findFirst.mockResolvedValue({
      id: 7,
    });
    await expect(service.importStage(3, 2, [dto])).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
  });

  it('validates every imported row before starting the transaction', async () => {
    await expect(
      service.importStage(3, 2, [dto, { ...dto, unit: '' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks stage imports after signing', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...parent,
      qa_staff_approved_at: new Date(),
    });
    await expect(service.importStage(3, 2, [dto])).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
  });
});
