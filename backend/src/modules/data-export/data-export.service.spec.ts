import { DataExportService } from './data-export.service';

describe('DataExportService', () => {
  const prisma = {
    items: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const service = new DataExportService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports active items as a paginated, flat dataset', async () => {
    prisma.items.count.mockReturnValue('count-query');
    prisma.items.findMany.mockReturnValue('items-query');
    prisma.$transaction.mockResolvedValue([
      2,
      [
        {
          item_code: 'TP001',
          item_name: 'Sản phẩm A',
          unit: 'Hộp',
          dk_code: null,
          registration_id: null,
          registration: {
            registration_number: 'VD-12345-26',
            product_name: 'Sản phẩm đăng ký A',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
            updated_at: new Date('2026-01-02T00:00:00.000Z'),
            deleted_at: null,
          },
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          update_at: new Date('2026-01-02T00:00:00.000Z'),
          deleted_at: null,
        },
      ],
    ]);

    await expect(
      service.exportItems({ page: 1, limit: 500 }),
    ).resolves.toMatchObject({
      data: [
        expect.objectContaining({
          item_code: 'TP001',
          registration: expect.objectContaining({
            registration_number: 'VD-12345-26',
            product_name: 'Sản phẩm đăng ký A',
          }),
        }),
      ],
      pagination: {
        page: 1,
        limit: 500,
        total: 2,
        total_pages: 1,
        has_next_page: true,
      },
    });

    expect(prisma.items.count).toHaveBeenCalledWith({
      where: { deleted_at: null },
    });
    expect(prisma.items.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deleted_at: null },
        orderBy: [{ created_at: 'asc' }, { item_code: 'asc' }],
        skip: 0,
        take: 500,
      }),
    );
  });

  it('filters updated records and includes soft-deleted items on request', async () => {
    prisma.items.count.mockReturnValue('count-query');
    prisma.items.findMany.mockReturnValue('items-query');
    prisma.$transaction.mockResolvedValue([0, []]);

    await service.exportItems({
      page: 2,
      limit: 100,
      include_deleted: 'true',
      updated_from: '2026-01-01T00:00:00.000Z',
    });

    expect(prisma.items.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { update_at: { gte: new Date('2026-01-01T00:00:00.000Z') } },
        skip: 100,
        take: 100,
      }),
    );
  });
});
