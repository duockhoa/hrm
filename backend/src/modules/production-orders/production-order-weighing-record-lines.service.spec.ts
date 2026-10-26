import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { productionOrderModelWhere } from 'src/access/production-order-scope.extension';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';
import * as lotCheckUpload from './production-order-weighing-record-lot-check-upload.config';

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
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 7, lotCheck: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
      productionOrderWeighingRecordLineChecks: {
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 1, images: [] }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest
          .fn()
          .mockImplementation(async ({ create }) => ({ id: 1, ...create })),
      },
      productionOrderWeighingRecordLineCheckImages: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn(async (action) => action(prisma));
    service = new ProductionOrderWeighingRecordLinesService(
      prisma as PrismaService,
    );
  });
  afterEach(() => jest.restoreAllMocks());

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
      include: {
        lotCheck: { include: { images: { orderBy: { id: 'asc' } } } },
        details: {
          orderBy: { id: 'asc' },
          include: {
            images: { orderBy: { id: 'asc' } },
            weighedBy: { select: { id: true, username: true, name: true } },
          },
        },
      },
    });
  });

  it.each([true, false])(
    'stores lot check %s with the authenticated user and server time',
    async (isCorrect) => {
      const result = await service.checkLot(
        3,
        7,
        { lot_no: 'LOT01', is_correct: isCorrect },
        { id: '9' },
      );
      expect(result).toMatchObject({
        production_order_weighing_record_line_id: 7,
        is_correct: isCorrect,
        checked_by_id: 9,
        checked_at: expect.any(Date),
      });
      expect(
        prisma.productionOrderWeighingRecordLineChecks.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { production_order_weighing_record_line_id: 7 },
          update: expect.objectContaining({
            is_correct: isCorrect,
            checked_by_id: 9,
          }),
        }),
      );
    },
  );

  it('rejects stale lot checks without saving a result', async () => {
    prisma.productionOrderWeighingRecordLines.updateMany.mockResolvedValue({
      count: 0,
    });
    await expect(
      service.checkLot(3, 7, { lot_no: 'OLD', is_correct: true }, { id: 9 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.productionOrderWeighingRecordLineChecks.upsert,
    ).not.toHaveBeenCalled();
  });

  it('creates multiple image children atomically and appends images on rechecking', async () => {
    const files = [
      { filename: 'a.png' },
      { filename: 'b.png' },
    ] as Express.Multer.File[];
    await service.checkLot(
      3,
      7,
      { lot_no: 'LOT', is_correct: false },
      { id: 9 },
      files,
    );
    const query =
      prisma.productionOrderWeighingRecordLineChecks.upsert.mock.calls[0][0];
    const images = {
      create: [
        {
          image_path:
            '/production-orders/weighing-record-lot-checks/images/a.png',
        },
        {
          image_path:
            '/production-orders/weighing-record-lot-checks/images/b.png',
        },
      ],
    };
    expect(query.create.images).toEqual(images);
    expect(query.update.images).toEqual(images);
    expect(query.include).toEqual({ images: { orderBy: { id: 'asc' } } });
    expect(query.update.images).not.toHaveProperty('deleteMany');
  });

  it('rejects more than 20 images without starting a write', async () => {
    await expect(
      service.checkLot(
        3,
        7,
        { lot_no: 'LOT', is_correct: true },
        { id: 9 },
        Array(21).fill({ filename: 'a.png' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('removes obsolete lot-check image files after changing the lot', async () => {
    const remove = jest
      .spyOn(
        lotCheckUpload,
        'removeProductionOrderWeighingRecordLotCheckImageByPath',
      )
      .mockResolvedValue(undefined);
    prisma.productionOrderWeighingRecordLineChecks.findUnique.mockResolvedValue(
      { images: [{ image_path: '/old.png' }] },
    );
    await service.update(3, 7, { lot_no: 'NEW' });
    expect(remove).toHaveBeenCalledWith('/old.png');
  });

  it('rejects deletion of an image outside the requested material line', async () => {
    await expect(service.deleteLotCheckImage(3, 7, 8)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prisma.productionOrderWeighingRecordLineCheckImages.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 8,
        lotCheck: { production_order_weighing_record_line_id: 7 },
      },
    });
    expect(
      prisma.productionOrderWeighingRecordLineCheckImages.delete,
    ).not.toHaveBeenCalled();
  });

  it('deletes only the selected image and returns the remaining gallery', async () => {
    const remove = jest
      .spyOn(
        lotCheckUpload,
        'removeProductionOrderWeighingRecordLotCheckImageByPath',
      )
      .mockResolvedValue(undefined);
    prisma.productionOrderWeighingRecordLineCheckImages.findFirst.mockResolvedValue(
      { id: 8, image_path: '/saved.png' },
    );
    prisma.productionOrderWeighingRecordLineChecks.findUniqueOrThrow.mockResolvedValue(
      { id: 1, images: [{ id: 9 }] },
    );
    expect(await service.deleteLotCheckImage(3, 7, 8)).toEqual({
      id: 1,
      images: [{ id: 9 }],
    });
    expect(
      prisma.productionOrderWeighingRecordLineCheckImages.delete,
    ).toHaveBeenCalledWith({ where: { id: 8 } });
    expect(remove).toHaveBeenCalledWith('/saved.png');
  });

  it('does not resolve an image file when it is absent or hidden by scope', async () => {
    const resolve = jest.spyOn(
      lotCheckUpload,
      'resolveProductionOrderWeighingRecordLotCheckImageFile',
    );
    await expect(
      service.findLotCheckImage('hidden.png'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(resolve).not.toHaveBeenCalled();
    expect(
      productionOrderModelWhere(
        'ProductionOrderWeighingRecordLineCheckImages',
        [3],
      ),
    ).toEqual({
      lotCheck: {
        is: {
          weighingRecordLine: {
            is: {
              weighingRecord: { is: { production_order_id: { in: [3] } } },
            },
          },
        },
      },
    });
  });

  it('rejects a lot check for a line belonging to another record', async () => {
    await expect(
      service.checkLot(4, 7, { lot_no: 'LOT', is_correct: true }, { id: 9 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      prisma.productionOrderWeighingRecordLineChecks.upsert,
    ).not.toHaveBeenCalled();
  });

  it('clears lot checks when the lot or material code changes, keeping checks on other edits', async () => {
    await service.update(3, 7, { lot_no: 'NEW' });
    expect(
      prisma.productionOrderWeighingRecordLineChecks.deleteMany,
    ).toHaveBeenCalledWith({
      where: { production_order_weighing_record_line_id: 7 },
    });
    prisma.productionOrderWeighingRecordLineChecks.deleteMany.mockClear();
    await service.update(3, 7, { note: 'note' });
    expect(
      prisma.productionOrderWeighingRecordLineChecks.deleteMany,
    ).not.toHaveBeenCalled();
    await service.update(3, 7, { item_code: 'NEW' });
    expect(
      prisma.productionOrderWeighingRecordLineChecks.deleteMany,
    ).toHaveBeenCalledTimes(1);
  });

  it('rejects non-boolean results and missing users', async () => {
    await expect(
      service.checkLot(3, 7, { lot_no: 'LOT', is_correct: 'false' } as any, {
        id: 9,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.checkLot(3, 7, { lot_no: 'LOT', is_correct: false }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
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
      include: {
        lotCheck: { include: { images: { orderBy: { id: 'asc' } } } },
      },
    });
  });

  it.each([{ status: 'approved' }, { ipc_staff_approved_at: new Date() }])(
    'blocks every child mutation after approval %j',
    async (approval) => {
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
      expect(
        prisma.productionOrderWeighingRecords.update,
      ).not.toHaveBeenCalled();
    },
  );

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

  it('imports selected lines atomically using source line identity', async () => {
    const result = await service.importLines(3, [
      { ...dto, source_line_number: 0, lot_no: 'LOT-A' },
      { ...dto, source_line_number: 1, lot_no: 'LOT-B' },
    ]);
    expect(result.map((row) => row.lot_no)).toEqual(['LOT-A', 'LOT-B']);
    expect(
      prisma.productionOrderWeighingRecordLines.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_weighing_record_id: 3,
          source_line_number: { in: [0, 1] },
        },
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects any duplicate selected source line before writing', async () => {
    prisma.productionOrderWeighingRecordLines.findFirst.mockResolvedValue({
      id: 7,
    });
    await expect(
      service.importLines(3, [{ ...dto, source_line_number: 0 }]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
  });

  it('blocks manual imports after signing', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...parent,
      ipc_staff_approved_at: new Date(),
    });
    await expect(
      service.importLines(3, [{ ...dto, source_line_number: 0 }]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.productionOrderWeighingRecordLines.create,
    ).not.toHaveBeenCalled();
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

  it.each(['ipc_staff_approved_at'])(
    'blocks stage imports after %s signing',
    async (signature) => {
      prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
        ...parent,
        [signature]: new Date(),
      });
      await expect(service.importStage(3, 2, [dto])).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        prisma.productionOrderWeighingRecordLines.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('allows adding, updating and importing materials after QA approval without clearing the signature', async () => {
    const approvedAt = new Date();
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...parent,
      qa_staff_approved_at: approvedAt,
    });
    await service.create(3, dto);
    await service.update(3, 7, { planned_quantity: '2' });
    await service.importStage(3, 2, [dto]);
    await service.importLines(3, [{ ...dto, source_line_number: 1 }]);
    expect(prisma.productionOrderWeighingRecords.update).toHaveBeenCalledTimes(
      4,
    );
    for (const [args] of prisma.productionOrderWeighingRecords.update.mock
      .calls) {
      expect(args.where.qa_staff_approved_at).toBe(approvedAt);
      expect(args.where.ipc_staff_approved_at).toBeNull();
      expect(args.data).not.toHaveProperty('qa_staff_approved_at');
    }
    expect(
      prisma.productionOrderWeighingRecordLines.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { planned_quantity: new Prisma.Decimal(2) },
      }),
    );
  });
});
