import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ProductionOrderFinishedProductSummariesService', () => {
  let service: ProductionOrderFinishedProductSummariesService;
  const auditLogsService = { findAll: jest.fn() };
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderFinishedProductSummaries: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    auditLogsService.findAll.mockReset();
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderFinishedProductSummaries: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderFinishedProductSummariesService,
        { provide: AuditLogsService, useValue: auditLogsService },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderFinishedProductSummariesService>(
      ProductionOrderFinishedProductSummariesService,
    );
  });

  it('checks access to the summary before reading only its audit logs', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 7 },
    );
    const history = {
      data: [],
      meta: { page: 2, limit: 20, total: 0, total_pages: 0 },
    };
    auditLogsService.findAll.mockResolvedValue(history);

    await expect(service.findHistory(7, { page: 2, limit: 20 })).resolves.toBe(
      history,
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.findUnique,
    ).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true },
    });
    expect(auditLogsService.findAll).toHaveBeenCalledWith({
      entity_type: 'production_order_finished_product_summaries',
      entity_id: '7',
      page: 2,
      limit: 20,
    });
  });

  it('does not expose audit logs when the summary is missing or outside the user scope', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      null,
    );
    await expect(service.findHistory(7, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auditLogsService.findAll).not.toHaveBeenCalled();
  });

  it('keeps the edit reason out of the summary table', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 7 },
    );
    await service.update(7, {
      package_count: 12,
      reason: 'Điều chỉnh theo kiểm đếm',
    });
    expect(
      prismaService.productionOrderFinishedProductSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ data: { package_count: 12 } }),
    );
  });

  it.each([123, 'x'.repeat(2001)])(
    'rejects an invalid edit reason before writing: %s',
    async (reason) => {
      prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
        { id: 7 },
      );
      await expect(
        service.update(7, { package_count: 12, reason: reason as string }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        prismaService.productionOrderFinishedProductSummaries.update,
      ).not.toHaveBeenCalled();
    },
  );

  it('gets finished product summaries for a production order', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      summaries,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      summaries,
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets all finished product summaries', async () => {
    const summaries = [
      {
        id: 2,
        production_order_id: 2032,
        productionOrder: {
          id: 2032,
          samplingRequests: [
            {
              id: 15,
              status: 'sent',
              google_doc_url: 'https://docs.google.com/document/d/abc',
              sent_at: new Date('2026-08-27T08:00:00.000Z'),
              location: 'Kho thành phẩm',
              sender: { id: 7, name: 'Binh' },
            },
          ],
        },
      },
    ];
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      summaries,
    );

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 2,
        production_order_id: 2032,
        productionOrder: {
          id: 2032,
          pyclm: {
            isSent: true,
            status: 'sent',
            googleDocUrl: 'https://docs.google.com/document/d/abc',
            sentAt: new Date('2026-08-27T08:00:00.000Z'),
            location: 'Kho thành phẩm',
            sender: { id: 7, name: 'Binh' },
          },
        },
      },
    ]);
    expect(
      prismaService.productionOrderFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a finished product summary by id', async () => {
    const summary = {
      id: 1,
      production_order_id: 2031,
      productionOrder: {
        id: 2031,
        samplingRequests: [],
      },
    };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      summary,
    );

    await expect(service.findById(1)).resolves.toEqual({
      id: 1,
      production_order_id: 2031,
      productionOrder: {
        id: 2031,
        pyclm: {
          isSent: false,
          status: null,
          googleDocUrl: null,
          sentAt: null,
          location: null,
          sender: null,
        },
      },
    });
    expect(
      prismaService.productionOrderFinishedProductSummaries.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the finished product summary does not exist', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a finished product summary with normalized input', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    const result = await service.create(
      2031,
      {
        package_count: ' 12 ',
        boxes_per_package: '024',
        loose_box_count: 3,
        note: ' Đóng gói cuối ca ',
      },
      { id: 7 },
    );

    expect(result).toBe(createdSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          package_count: 12,
          boxes_per_package: 24,
          loose_box_count: 3,
          note: 'Đóng gói cuối ca',
          created_by_id: 7,
        },
      }),
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows creating multiple finished product summaries for a production order', async () => {
    const createdSummary = { id: 2, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await expect(
      service.create(
        2031,
        {
          package_count: 12,
          boxes_per_package: 24,
          loose_box_count: 3,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.create,
    ).toHaveBeenCalledTimes(1);
  });

  it('updates supplied finished product summary fields', async () => {
    const updatedSummary = { id: 1, package_count: 14 };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderFinishedProductSummaries.update.mockResolvedValue(
      updatedSummary,
    );

    await expect(
      service.update(1, { package_count: ' 014 ', note: ' Đã kiểm tra ' }),
    ).resolves.toBe(updatedSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { package_count: 14, note: 'Đã kiểm tra' },
      }),
    );
  });

  it('clears a finished product summary note with an empty value', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderFinishedProductSummaries.update.mockResolvedValue(
      { id: 1, note: null },
    );

    await expect(service.update(1, { note: '   ' })).resolves.toEqual({
      id: 1,
      note: null,
    });
    expect(
      prismaService.productionOrderFinishedProductSummaries.update,
    ).toHaveBeenCalledWith(expect.objectContaining({ data: { note: null } }));
  });

  it('rejects an empty finished product summary update', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes a finished product summary', async () => {
    const deletedSummary = { id: 1 };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderFinishedProductSummaries.delete.mockResolvedValue(
      deletedSummary,
    );

    await expect(service.delete(1)).resolves.toBe(deletedSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.delete,
    ).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });

  it('throws BadRequestException when a count is not an integer', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          package_count: 12.5,
          boxes_per_package: 24,
          loose_box_count: 3,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        package_count: 12,
        boxes_per_package: 24,
        loose_box_count: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a non-string note', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          package_count: 12,
          boxes_per_package: 24,
          loose_box_count: 3,
          note: 1 as any,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
