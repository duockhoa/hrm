import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { productionOrderModelWhere } from 'src/access/production-order-scope.extension';
import { ProductionOrderWeighingRecordDetailsService } from './production-order-weighing-record-details.service';
import {
  removeProductionOrderWeighingRecordDetailImageByPath,
  resolveProductionOrderWeighingRecordDetailImageFile,
} from './production-order-weighing-record-detail-upload.config';

jest.mock('./production-order-weighing-record-detail-upload.config', () => ({
  PRODUCTION_ORDER_WEIGHING_RECORD_DETAIL_IMAGE_ROUTE: '/images',
  getProductionOrderWeighingRecordDetailImagePath: (file) =>
    file ? `/images/${file.filename}` : undefined,
  removeProductionOrderWeighingRecordDetailImageByPath: jest
    .fn()
    .mockResolvedValue(undefined),
  resolveProductionOrderWeighingRecordDetailImageFile: jest
    .fn()
    .mockResolvedValue({
      filePath: '/test.png',
      contentType: 'image/png',
      size: 1,
    }),
}));

describe('Weighing record details', () => {
  let service: ProductionOrderWeighingRecordDetailsService;
  let prisma: any;
  const record = {
    id: 3,
    status: 'draft',
    qa_staff_approved_at: new Date('2026-10-25T00:00:00Z'),
    ipc_staff_approved_at: null,
  };
  const detail = {
    id: 9,
    production_order_weighing_record_line_id: 7,
    net_weight: new Prisma.Decimal('1'),
    unit: 'kg',
    image_path: '/images/old.png',
    images: [
      { id: 11, image_path: '/images/old.png' },
      { id: 12, image_path: '/images/second.png' },
    ],
    weighed_by_id: 1,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      productionOrderWeighingRecords: {
        findUnique: jest.fn().mockResolvedValue(record),
        update: jest.fn().mockResolvedValue({ id: 3 }),
      },
      productionOrderWeighingRecordLines: {
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.id === 7 && where.production_order_weighing_record_id === 3
              ? { id: 7, unit: 'kg' }
              : null,
          ),
      },
      productionOrderWeighingRecordDetails: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 9 }),
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.id === 9 &&
            where.production_order_weighing_record_line_id === 7
              ? detail
              : null,
          ),
        create: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ id: 9, ...data })),
        update: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ ...detail, ...data })),
        delete: jest.fn().mockResolvedValue(detail),
      },
    };
    prisma.$transaction = jest.fn(async (action) => action(prisma));
    service = new ProductionOrderWeighingRecordDetailsService(
      prisma as PrismaService,
    );
  });

  it('requires QA approval before writing a weighing and does not acquire a write lock when missing', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      qa_staff_approved_at: null,
    });
    await expect(
      service.create(3, 7, { net_weight: '1' }, { id: 4 }),
    ).rejects.toThrow(
      'Nhân viên ĐBCL cần ký duyệt trước khi nhập khối lượng cân.',
    );
    expect(prisma.productionOrderWeighingRecords.update).not.toHaveBeenCalled();
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).not.toHaveBeenCalled();
  });

  it('allows weighing after QA approval while comparing its signature in the parent lock', async () => {
    await service.create(3, 7, { net_weight: '-0.5' }, { id: 4 });
    expect(prisma.productionOrderWeighingRecords.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 3,
          status: 'draft',
          qa_staff_approved_at: record.qa_staff_approved_at,
          ipc_staff_approved_at: null,
        },
      }),
    );
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).toHaveBeenCalled();
  });

  it('rejects an IPC signature racing a weighing save before any detail is written', async () => {
    prisma.productionOrderWeighingRecords.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Concurrent IPC approval', {
        code: 'P2025',
        clientVersion: '6',
      }),
    );
    await expect(
      service.create(3, 7, { net_weight: '1' }, { id: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).not.toHaveBeenCalled();
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).not.toHaveBeenCalled();
  });

  it('reports the IPC lock even when QA has not signed', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      qa_staff_approved_at: null,
      ipc_staff_approved_at: new Date(),
    });
    await expect(
      service.create(3, 7, { net_weight: '1' }, { id: 4 }),
    ).rejects.toThrow('IPC đã ký duyệt');
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).not.toHaveBeenCalled();
  });

  it('creates exact weight with the line unit and authenticated weigher/time', async () => {
    const result = await service.create(
      3,
      7,
      { net_weight: '999999999999.999999', note: ' ok ' },
      { id: '4' },
    );
    expect(result.net_weight.toString()).toBe('999999999999.999999');
    expect(result).toMatchObject({
      unit: 'kg',
      weighed_by_id: 4,
      note: 'ok',
      production_order_weighing_record_line_id: 7,
      weighed_at: expect.any(Date),
    });
    expect(
      prisma.productionOrderWeighingRecords.update.mock.invocationCallOrder[0],
    ).toBeLessThan(
      prisma.productionOrderWeighingRecordDetails.create.mock
        .invocationCallOrder[0],
    );
  });

  it.each([
    0,
    '-0.000000',
    '-0.0000001',
    '-1000000000000',
    null,
    true,
    '1e3',
    '0.0000001',
    '1000000000000',
    '1.1234567',
    '',
  ])('rejects invalid weight %j', async (net_weight) => {
    await expect(
      service.create(3, 7, { net_weight } as any, { id: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['-0.000001', '-12.345678', '-999999999999.999999', -1])(
    'accepts negative weight %s on create and update',
    async (net_weight) => {
      const result = await service.create(3, 7, { net_weight }, { id: 4 });
      expect(result.net_weight.toString()).toBe(
        new Prisma.Decimal(net_weight).toString(),
      );
      await service.update(3, 7, 9, { net_weight }, { id: 4 });
      expect(
        prisma.productionOrderWeighingRecordDetails.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            net_weight: new Prisma.Decimal(net_weight),
          }),
        }),
      );
    },
  );

  it.each([
    { unit: 'g' },
    { weighed_by_id: 2 },
    { weighed_at: '2026-01-01' },
    { image_path: '/arbitrary.png' },
    { gross_weight: 1 },
    { tare_weight: 1 },
    { container_code: 'x' },
    { equipment_id: 1 },
    { checked_by_id: 1 },
    { line_order: 1 },
  ])('rejects fields outside the agreed structure %j', async (extra) => {
    await expect(
      service.create(3, 7, { net_weight: '1', ...extra } as any, { id: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('saves the image reference and note in the same create transaction as the weight', async () => {
    const result = await service.create(
      3,
      7,
      { net_weight: '1.25', note: ' note ' },
      { id: 4 },
      { filename: 'new.png' } as Express.Multer.File,
    );
    expect(result).toMatchObject({
      image_path: '/images/new.png',
      note: 'note',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          image_path: '/images/new.png',
          net_weight: new Prisma.Decimal('1.25'),
          note: 'note',
        }),
      }),
    );
  });

  it('rejects missing authentication, empty updates and invalid notes', async () => {
    await expect(
      service.create(3, 7, { net_weight: '1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.update(3, 7, 9, {}, { id: 4 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(3, 7, {} as any, { id: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(3, 7, { net_weight: '1', note: 3 } as any, { id: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports note-only corrections without changing weighing identity or time', async () => {
    await service.update(3, 7, 9, { note: null }, { id: 4 });
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).toHaveBeenCalledWith(expect.objectContaining({ data: { note: null } }));
    await service.update(3, 7, 9, { net_weight: '0.000001' }, { id: 4 });
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          net_weight: new Prisma.Decimal('0.000001'),
          weighed_by_id: 4,
          weighed_at: expect.any(Date),
        },
      }),
    );
  });

  it('rejects records outside the parent chain', async () => {
    await expect(service.findAll(4, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findById(3, 7, 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(3, 7, 10, { note: 'x' }, { id: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).not.toHaveBeenCalled();
  });

  it('lists only details belonging to the selected material line', async () => {
    await service.findAll(3, 7);
    expect(
      prisma.productionOrderWeighingRecordDetails.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_weighing_record_line_id: 7 },
        orderBy: { id: 'asc' },
      }),
    );
  });

  it.each([
    { status: 'approved' },
    { qa_staff_approved_at: null },
    { ipc_staff_approved_at: new Date() },
  ])(
    'blocks weights and images before QA approval or after final approval %j',
    async (approval) => {
      prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
        ...record,
        ...approval,
      });
      const file = { filename: 'new.png' } as Express.Multer.File;
      await expect(
        service.create(3, 7, { net_weight: '1' }, { id: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.update(3, 7, 9, { note: 'x' }, { id: 4 }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.delete(3, 7, 9)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(service.uploadImage(3, 7, 9, file)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(service.deleteImage(3, 7, 9)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(
        service.uploadImages(3, 7, 9, [file]),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.deleteImageById(3, 7, 9, 11)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        removeProductionOrderWeighingRecordDetailImageByPath,
      ).not.toHaveBeenCalled();
    },
  );

  it('creates all images together with the weight', async () => {
    await service.create(3, 7, { net_weight: '1' }, { id: 4 }, [
      { filename: 'a.png' },
      { filename: 'b.png' },
    ] as Express.Multer.File[]);
    expect(
      prisma.productionOrderWeighingRecordDetails.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          image_path: '/images/a.png',
          images: {
            create: [
              { image_path: '/images/a.png' },
              { image_path: '/images/b.png' },
            ],
          },
        }),
      }),
    );
  });

  it('appends images without replacing existing images', async () => {
    await service.uploadImages(3, 7, 9, [
      { filename: 'a.png' },
    ] as Express.Multer.File[]);
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          image_path: '/images/old.png',
          images: { create: [{ image_path: '/images/a.png' }] },
        },
      }),
    );
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).not.toHaveBeenCalled();
  });

  it('deletes only the requested image and updates the legacy preview', async () => {
    await service.deleteImageById(3, 7, 9, 11);
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          image_path: '/images/second.png',
          images: { delete: { id: 11 } },
        },
      }),
    );
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).toHaveBeenCalledTimes(1);
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).toHaveBeenCalledWith('/images/old.png');
  });

  it('rejects deleting an image belonging to a different detail', async () => {
    await expect(service.deleteImageById(3, 7, 9, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prisma.productionOrderWeighingRecordDetails.update,
    ).not.toHaveBeenCalled();
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).not.toHaveBeenCalled();
  });

  it('serves images through the scoped detail and its image relation', async () => {
    await service.findImage('second.png');
    expect(
      prisma.productionOrderWeighingRecordDetails.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { image_path: '/images/second.png' },
            { images: { some: { image_path: '/images/second.png' } } },
          ],
        },
      }),
    );
    expect(
      productionOrderModelWhere(
        'ProductionOrderWeighingRecordDetailImages',
        [42],
      ),
    ).toEqual({
      weighingRecordDetail: {
        is: {
          weighingRecordLine: {
            is: {
              weighingRecord: { is: { production_order_id: { in: [42] } } },
            },
          },
        },
      },
    });
  });

  it('replaces and removes a single image only after the database change', async () => {
    expect(
      (
        await service.uploadImage(3, 7, 9, {
          filename: 'new.png',
        } as Express.Multer.File)
      ).image_path,
    ).toBe('/images/new.png');
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).toHaveBeenCalledWith('/images/old.png');
    expect(
      prisma.productionOrderWeighingRecordDetails.update.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(removeProductionOrderWeighingRecordDetailImageByPath).mock
        .invocationCallOrder[0],
    );
    expect((await service.deleteImage(3, 7, 9)).image_path).toBeNull();
    await service.delete(3, 7, 9);
    expect(
      prisma.productionOrderWeighingRecordDetails.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9, production_order_weighing_record_line_id: 7 },
      }),
    );
  });

  it('does not remove old files on a failed mutation or serve images outside scope', async () => {
    prisma.productionOrderWeighingRecordDetails.update.mockRejectedValue(
      new Error('database failure'),
    );
    await expect(
      service.uploadImage(3, 7, 9, {
        filename: 'new.png',
      } as Express.Multer.File),
    ).rejects.toThrow('database failure');
    expect(
      removeProductionOrderWeighingRecordDetailImageByPath,
    ).not.toHaveBeenCalled();
    prisma.productionOrderWeighingRecordDetails.findFirst.mockResolvedValue(
      null,
    );
    await expect(service.findImage('new.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      resolveProductionOrderWeighingRecordDetailImageFile,
    ).not.toHaveBeenCalled();
  });

  it('inherits visibility through line and record, including image lookup', () => {
    expect(
      productionOrderModelWhere('ProductionOrderWeighingRecordDetails', [42]),
    ).toEqual({
      weighingRecordLine: {
        is: { weighingRecord: { is: { production_order_id: { in: [42] } } } },
      },
    });
  });
});
