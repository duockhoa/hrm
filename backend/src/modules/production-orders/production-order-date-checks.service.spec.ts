import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';

describe('ProductionOrderDateChecksService create', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  let service: ProductionOrderDateChecksService;

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({ id: 2001 });
    service = new ProductionOrderDateChecksService({
      productionOrders: { findUnique },
      productionOrderDateChecks: { create },
    } as unknown as PrismaService);
  });

  it('rejects creation without a request file before saving', async () => {
    await expect(
      service.create(2001, { package_type: 'goi' }, { id: 7 }),
    ).rejects.toThrow('Vui lòng đính kèm file yêu cầu in date.');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a check with the attached request file', async () => {
    const requestFilePath = '/production-orders/date-checks/request-files/date.pdf';
    create.mockResolvedValue({ id: 1, request_file_path: requestFilePath });

    await expect(
      service.create(2001, { package_type: 'goi' }, { id: 7 }, { requestFilePath }),
    ).resolves.toEqual({ id: 1, request_file_path: requestFilePath });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2001,
          request_file_path: requestFilePath,
        }),
      }),
    );
  });
});

describe('ProductionOrderDateChecksService global list', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const transaction = jest.fn((queries) => Promise.all(queries));
  const groupBy = jest.fn();
  const findImages = jest.fn();
  let service: ProductionOrderDateChecksService;

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation((queries) => Promise.all(queries));
    service = new ProductionOrderDateChecksService({
      $transaction: transaction,
      productionOrderDateChecks: { findMany, count },
      productionOrderDateCheckImages: { groupBy, findMany: findImages },
    } as unknown as PrismaService);
  });

  it('paginates filtered checks before loading last upload metadata', async () => {
    findMany.mockResolvedValue([{ id: 51 }]);
    count.mockResolvedValue(80);
    groupBy.mockResolvedValue([]);
    const result = await service.findAll({ search: 'aspirin 001', approval_status: 'approved', has_images: 'true', page: 2, limit: 20 });
    expect(result).toEqual({ data: [{ id: 51, last_image_uploaded_at: null, last_image_uploaded_by: null }], total: 80, page: 2, limit: 20 });
    const query = findMany.mock.calls[0][0];
    expect(query).toMatchObject({ skip: 20, take: 20, where: { approval_status: 'approved', images: { some: {} } } });
    expect(query.where.AND).toHaveLength(2);
    expect(count).toHaveBeenCalledWith({ where: query.where });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: 'RepeatableRead' });
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { date_check_id: { in: [51] } } }));
  });

  it('retains total on an empty page and skips upload metadata queries', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(2);
    expect(await service.findAll({ page: 10 })).toEqual({ data: [], total: 2, page: 10, limit: 50 });
    expect(groupBy).not.toHaveBeenCalled();
    expect(findImages).not.toHaveBeenCalled();
  });

  it('keeps array response for search without pagination and avoids counting', async () => {
    findMany.mockResolvedValue([]);
    expect(await service.findAll({ search: 'aspirin' })).toEqual([]);
    expect(count).not.toHaveBeenCalled();
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('take');
  });

  it('matches the latest image times to their checks, including checks without images', async () => {
    const checkedAt = new Date('2026-10-10T01:00:00Z');
    const firstUpload = new Date('2026-10-11T02:00:00Z');
    const secondUpload = new Date('2026-10-11T03:00:00Z');
    const firstUploader = { id: 7, name: 'First uploader' };
    const secondUploader = { id: 8, name: 'Second uploader' };
    const checks = [
      { id: 1, production_order_id: 2001, checked_at: checkedAt },
      { id: 2, production_order_id: 2002, checked_at: checkedAt },
      { id: 3, production_order_id: 2003, checked_at: checkedAt },
    ];
    findMany.mockResolvedValue(checks);
    groupBy.mockResolvedValue([
      { date_check_id: 2, _max: { created_at: secondUpload } },
      { date_check_id: 1, _max: { created_at: firstUpload } },
    ]);
    findImages.mockResolvedValue([
      { date_check_id: 2, created_at: secondUpload, createdBy: secondUploader },
      { date_check_id: 1, created_at: firstUpload, createdBy: firstUploader },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        ...checks[0],
        last_image_uploaded_at: firstUpload,
        last_image_uploaded_by: firstUploader,
      },
      {
        ...checks[1],
        last_image_uploaded_at: secondUpload,
        last_image_uploaded_by: secondUploader,
      },
      {
        ...checks[2],
        last_image_uploaded_at: null,
        last_image_uploaded_by: null,
      },
    ]);
    // The list needs timestamps, not full image metadata or one query per check.
    expect(findMany.mock.calls[0][0].include.images).toBe(false);
    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith({
      by: ['date_check_id'],
      where: { date_check_id: { in: [1, 2, 3] } },
      _max: { created_at: true },
    });
    expect(findImages).toHaveBeenCalledTimes(1);
    expect(findImages).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { date_check_id: 2, created_at: secondUpload },
            { date_check_id: 1, created_at: firstUpload },
          ],
        },
        orderBy: { id: 'desc' },
        distinct: ['date_check_id'],
      }),
    );
  });

  it('skips the image query when no checks exist', async () => {
    findMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(groupBy).not.toHaveBeenCalled();
    expect(findImages).not.toHaveBeenCalled();
  });

  it('skips uploader lookups when all checks have no images', async () => {
    findMany.mockResolvedValue([{ id: 1 }]);
    groupBy.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([
      { id: 1, last_image_uploaded_at: null, last_image_uploaded_by: null },
    ]);
    expect(findImages).not.toHaveBeenCalled();
  });
});
