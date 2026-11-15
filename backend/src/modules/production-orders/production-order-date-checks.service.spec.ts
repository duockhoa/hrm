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
    const requestFilePath =
      '/production-orders/date-checks/request-files/date.pdf';
    create.mockResolvedValue({ id: 1, request_file_path: requestFilePath });

    await expect(
      service.create(
        2001,
        { package_type: 'goi' },
        { id: 7 },
        { requestFilePath },
      ),
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
    transaction.mockImplementation((queries) =>
      typeof queries === 'function'
        ? queries({
            productionOrderDateChecks: { findMany, count },
            productionOrderDateCheckImages: { groupBy, findMany: findImages },
          })
        : Promise.all(queries),
    );
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
    const result = await service.findAll({
      search: 'aspirin 001',
      approval_status: 'approved',
      has_images: 'true',
      page: 2,
      limit: 20,
    });
    expect(result).toEqual({
      data: [
        { id: 51, last_image_uploaded_at: null, last_image_uploaded_by: null },
      ],
      total: 80,
      page: 2,
      limit: 20,
    });
    const query = findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      skip: 20,
      take: 20,
      where: { approval_status: 'approved', images: { some: {} } },
    });
    expect(query.where.AND).toHaveLength(2);
    expect(count).toHaveBeenCalledWith({ where: query.where });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    });
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { date_check_id: { in: [51] } } }),
    );
  });

  it('retains total on an empty page and skips upload metadata queries', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(2);
    expect(await service.findAll({ page: 10 })).toEqual({
      data: [],
      total: 2,
      page: 10,
      limit: 50,
    });
    expect(groupBy).not.toHaveBeenCalled();
    expect(findImages).not.toHaveBeenCalled();
  });

  it('ranks all filtered checks by latest image before paging and restores that order after hydration', async () => {
    const firstUpload = new Date('2026-11-15T02:00:00Z');
    const secondUpload = new Date('2026-11-15T01:00:00Z');
    const uploads = [
      { date_check_id: 8, _max: { created_at: firstUpload } },
      { date_check_id: 1, _max: { created_at: secondUpload } },
    ];
    groupBy.mockResolvedValue(uploads);
    count.mockResolvedValue(710);
    findMany.mockResolvedValue([{ id: 1 }, { id: 8 }]);
    findImages.mockResolvedValue([
      { date_check_id: 8, created_at: firstUpload, createdBy: { id: 7 } },
      { date_check_id: 1, created_at: secondUpload, createdBy: { id: 9 } },
    ]);

    await expect(
      service.findAll({
        approval_status: 'approved',
        has_images: 'true',
        order_by: 'last_image_uploaded_at',
        page: 2,
        limit: 300,
      }),
    ).resolves.toEqual({
      data: [
        {
          id: 8,
          last_image_uploaded_at: firstUpload,
          last_image_uploaded_by: { id: 7 },
        },
        {
          id: 1,
          last_image_uploaded_at: secondUpload,
          last_image_uploaded_by: { id: 9 },
        },
      ],
      total: 710,
      page: 2,
      limit: 300,
    });
    const rankQuery = groupBy.mock.calls[0][0];
    expect(rankQuery).toMatchObject({
      by: ['date_check_id'],
      where: {
        dateCheck: {
          is: { approval_status: 'approved', images: { some: {} } },
        },
      },
      _max: { created_at: true },
      orderBy: [{ _max: { created_at: 'desc' } }, { date_check_id: 'desc' }],
      skip: 300,
      take: 300,
    });
    const where = rankQuery.where.dateCheck.is;
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith({
      where: { AND: [where, { id: { in: [8, 1] } }] },
      include: expect.objectContaining({ images: false }),
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    expect(groupBy).toHaveBeenNthCalledWith(2, {
      by: ['date_check_id'],
      where: { date_check_id: { in: [8, 1] } },
      _max: { created_at: true },
    });
  });

  it('keeps the total for an empty latest-upload page without hydration or uploader lookups', async () => {
    groupBy.mockResolvedValue([]);
    count.mockResolvedValue(310);
    await expect(
      service.findAll({
        has_images: 'true',
        order_by: 'last_image_uploaded_at',
        page: 3,
        limit: 300,
      }),
    ).resolves.toEqual({ data: [], total: 310, page: 3, limit: 300 });
    expect(groupBy).toHaveBeenCalledTimes(1);
    expect(findMany).not.toHaveBeenCalled();
    expect(findImages).not.toHaveBeenCalled();
  });

  it('searches the latest uploader label without matching an older uploader on the same check', async () => {
    const latestUpload = new Date('2026-11-15T02:00:00Z');
    const historicalUpload = new Date('2026-11-14T02:00:00Z');
    const images = [
      {
        date_check_id: 1,
        created_at: historicalUpload,
        createdBy: { name: 'Nguyễn Văn Bình' },
      },
      {
        date_check_id: 1,
        created_at: latestUpload,
        createdBy: { name: 'Trần Thị Mai' },
      },
      {
        date_check_id: 2,
        created_at: latestUpload,
        createdBy: { name: 'Nguyễn Văn Bình' },
      },
    ];
    groupBy.mockResolvedValue(
      [1, 2].map((id) => ({
        date_check_id: id,
        _max: { created_at: latestUpload },
      })),
    );
    findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    // Simulate the metadata query's latest-timestamp filter over upload history.
    findImages.mockImplementation(({ where }) =>
      images.filter((image) =>
        where.OR.some(
          (filter) =>
            filter.date_check_id === image.date_check_id &&
            filter.created_at.getTime() === image.created_at.getTime(),
        ),
      ),
    );

    const result = await service.findAll({
      has_images: 'true',
      order_by: 'last_image_uploaded_at',
      search: '  nguyen van binh  ',
      page: 1,
      limit: 300,
    });
    expect(result).toMatchObject({
      data: [{ id: 2, last_image_uploaded_by: { name: 'Nguyễn Văn Bình' } }],
      total: 1,
      page: 1,
      limit: 300,
    });
    expect(groupBy.mock.calls[0][0]).toMatchObject({
      where: { dateCheck: { is: { images: { some: {} } } } },
    });
    expect(groupBy.mock.calls[0][0]).not.toHaveProperty('take');
    expect(findImages.mock.calls[0][0].where.OR).not.toContainEqual({
      date_check_id: 1,
      created_at: historicalUpload,
    });
    expect(count).not.toHaveBeenCalled();
  });

  it.each([
    'LSX-ALPHA',
    'LOT-ALPHA',
    'vitamin tong hop',
    'tui nhom',
    'da duyet',
    'REF-ALPHA.pdf',
    '2026-10-31T19:15:00.000Z',
    '01/11/2026',
    '2026-11-01T18:50:00.000Z',
    '02/11/2026',
    '2026-11-14T19:05:00.000Z',
    '02:05 15/11/2026',
    'nguoi nhap',
    'nguoi duyet',
    'latest.user',
  ])('preserves the image list search projection: %s', async (search) => {
    const uploadedAt = new Date('2026-11-14T19:05:00Z');
    groupBy.mockResolvedValue([
      { date_check_id: 21, _max: { created_at: uploadedAt } },
    ]);
    findMany.mockResolvedValue([
      {
        id: 21,
        production_order_id: 2031,
        productionOrder: {
          production_order_code: 'LSX-ALPHA',
          lot_no: 'LOT-ALPHA',
          item_code: 'TP001',
          item: { item_name: 'Vitamin tổng hợp' },
        },
        package_type: 'tui_nhom',
        approval_status: 'approved',
        request_file_path:
          '/production-orders/date-checks/request-files/REF-ALPHA.pdf',
        created_at: new Date('2026-10-31T19:15:00Z'),
        checked_at: new Date('2026-11-01T18:50:00Z'),
        createdBy: { name: 'Người nhập' },
        approvedBy: { name: 'Người duyệt' },
      },
    ]);
    findImages.mockResolvedValue([
      {
        date_check_id: 21,
        created_at: uploadedAt,
        createdBy: {
          name: null,
          username: 'latest.user',
          email: 'hidden@example.com',
        },
      },
    ]);

    await expect(
      service.findAll({
        has_images: 'true',
        order_by: 'last_image_uploaded_at',
        search,
        page: 1,
        limit: 300,
      }),
    ).resolves.toMatchObject({ data: [{ id: 21 }], total: 1 });
  });

  it('matches a whole phrase within one displayed field and uses the displayed uploader fallback', async () => {
    const uploadedAt = new Date('2026-11-14T19:05:00Z');
    groupBy.mockResolvedValue([
      { date_check_id: 21, _max: { created_at: uploadedAt } },
    ]);
    findMany.mockResolvedValue([
      {
        id: 21,
        productionOrder: {
          lot_no: 'LOT-ALPHA',
          item: { item_name: 'Vitamin tổng hợp' },
        },
      },
    ]);
    findImages.mockResolvedValue([
      {
        date_check_id: 21,
        created_at: uploadedAt,
        createdBy: {
          name: 'Nguyễn Văn Bình',
          username: 'hidden.username',
          email: 'hidden@example.com',
        },
      },
    ]);
    for (const search of [
      'vitamin LOT-ALPHA',
      'hidden.username',
      'hidden@example.com',
    ]) {
      await expect(
        service.findAll({
          has_images: 'true',
          order_by: 'last_image_uploaded_at',
          search,
          page: 1,
          limit: 300,
        }),
      ).resolves.toMatchObject({ data: [], total: 0 });
    }
  });

  it('filters all search candidates before taking page 2 of 300 and retains totals beyond the last page', async () => {
    const uploadedAt = new Date('2026-11-14T19:05:00Z');
    const checks = Array.from({ length: 605 }, (_, index) => ({
      id: index + 1,
    }));
    const uploads = checks.map((check) => ({
      date_check_id: check.id,
      _max: { created_at: uploadedAt },
    }));
    groupBy.mockResolvedValue(uploads);
    findMany.mockResolvedValue(checks);
    findImages.mockResolvedValue(
      checks.map((check) => ({
        date_check_id: check.id,
        created_at: uploadedAt,
        createdBy: { name: check.id > 4 ? 'Nguyễn Văn Bình' : 'Trần Thị Mai' },
      })),
    );
    const options = {
      has_images: 'true',
      order_by: 'last_image_uploaded_at' as const,
      search: 'nguyen van binh',
      approval_status: 'approved' as const,
      item_code: 'TP001',
      page: 2,
      limit: 300,
    };

    const result = await service.findAll(options);
    expect(result).toMatchObject({ total: 601, page: 2, limit: 300 });
    expect(
      (result as { data: { id: number }[] }).data.map((check) => check.id),
    ).toEqual(Array.from({ length: 300 }, (_, index) => 305 - index));
    const rankQuery = groupBy.mock.calls[0][0];
    const where = {
      approval_status: 'approved',
      productionOrder: { is: { item_code: 'TP001' } },
      images: { some: {} },
    };
    expect(rankQuery.where).toEqual({ dateCheck: { is: where } });
    expect(rankQuery).not.toHaveProperty('skip');
    expect(rankQuery).not.toHaveProperty('take');
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { AND: [where, { id: { in: checks.map((check) => check.id) } }] },
      include: { images: false },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    expect(count).not.toHaveBeenCalled();

    await expect(
      service.findAll({ ...options, page: 4 }),
    ).resolves.toMatchObject({ data: [], total: 601, page: 4, limit: 300 });
  });

  it('retains the old array shape for image-list search without pagination', async () => {
    const uploadedAt = new Date('2026-11-14T19:05:00Z');
    groupBy.mockResolvedValue([
      { date_check_id: 21, _max: { created_at: uploadedAt } },
    ]);
    findMany.mockResolvedValue([
      { id: 21, request_file_path: '/REF-ALPHA.pdf' },
    ]);
    findImages.mockResolvedValue([
      {
        date_check_id: 21,
        created_at: uploadedAt,
        createdBy: { name: 'Uploader' },
      },
    ]);
    await expect(
      service.findAll({
        has_images: 'true',
        order_by: 'last_image_uploaded_at',
        search: 'REF-ALPHA',
      }),
    ).resolves.toEqual([expect.objectContaining({ id: 21 })]);
    expect(count).not.toHaveBeenCalled();
  });

  it('keeps an array response for latest-upload ordering without pagination', async () => {
    groupBy.mockResolvedValue([]);
    await expect(
      service.findAll({
        has_images: 'true',
        order_by: 'last_image_uploaded_at',
      }),
    ).resolves.toEqual([]);
    expect(groupBy.mock.calls[0][0]).not.toHaveProperty('take');
    expect(count).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([undefined, 'false'])(
    'requires image-only filtering for latest-upload ordering: %s',
    async (has_images) => {
      await expect(
        service.findAll({
          has_images,
          order_by: 'last_image_uploaded_at',
          page: 1,
        }),
      ).rejects.toThrow(
        'order_by=last_image_uploaded_at requires has_images=true',
      );
      expect(groupBy).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();
    },
  );

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
