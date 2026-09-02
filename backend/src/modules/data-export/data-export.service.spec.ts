import { DataExportService } from './data-export.service';

describe('DataExportService', () => {
  const prisma = {
    items: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    productionOrderFinishedProductSummaries: {
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

  it('exports finished product summaries with their original relations', async () => {
    prisma.productionOrderFinishedProductSummaries.count.mockReturnValue(
      'count-query',
    );
    prisma.productionOrderFinishedProductSummaries.findMany.mockReturnValue(
      'summaries-query',
    );
    prisma.$transaction.mockResolvedValue([
      1,
      [
        {
          id: 10,
          production_order_id: 100,
          package_count: 20,
          boxes_per_package: 10,
          loose_box_count: 3,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
          createdBy: { id: 1, username: 'operator' },
          productionOrder: {
            id: 100,
            production_order_code: 'LSX-001',
            item: { item_code: 'TP001', item_name: 'Sản phẩm A' },
            samplingRequests: [
              {
                id: 12,
                status: 'sent',
                google_doc_url: 'https://docs.google.com/document/d/example',
              },
            ],
            documentControl: {
              batch_record_issued_at: new Date('2026-01-03T00:00:00.000Z'),
              batch_record_received_at: null,
              test_certificate_received_at: null,
            },
            deviations: [
              { id: 5, deviation_content: 'Sai lệch minh họa', images: [] },
            ],
          },
        },
      ],
    ]);

    await expect(
      service.exportFinishedProductSummaries({ page: 1, limit: 10000 }),
    ).resolves.toMatchObject({
      data: [
        expect.objectContaining({
          id: 10,
          createdBy: expect.objectContaining({ username: 'operator' }),
          productionOrder: expect.objectContaining({
            production_order_code: 'LSX-001',
            samplingRequests: [
              expect.objectContaining({ status: 'sent' }),
            ],
            documentControl: expect.objectContaining({
              batch_record_issued_at: expect.any(Date),
            }),
            deviations: [
              expect.objectContaining({ deviation_content: 'Sai lệch minh họa' }),
            ],
          }),
        }),
      ],
      pagination: expect.objectContaining({ total: 1 }),
    });

    expect(
      prisma.productionOrderFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip: 0,
        take: 10000,
      }),
    );
  });
});
