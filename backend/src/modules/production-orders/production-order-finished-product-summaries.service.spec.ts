import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';

describe('ProductionOrderFinishedProductSummariesService', () => {
  let service: ProductionOrderFinishedProductSummariesService;
  const auditLogsService = { findAll: jest.fn() };
  const sapB1Client = {
    getProductionReceipts: jest.fn(),
    resolveProductionOrderEntry: jest.fn(),
    getReceiptItemTracking: jest.fn(),
    getProductionReceiptDistributionRules: jest.fn(),
    postProductionReceipt: jest.fn(),
    getProductionReceiptsForEntry: jest.fn(),
  };
  const receiptRequests = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let prismaService: {
    $transaction: jest.Mock;
    productionOrders: {
      findUnique: jest.Mock;
    };
    sapProductionReceiptRequests: typeof receiptRequests;
    productionOrderFinishedProductSummaries: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    auditLogsService.findAll.mockReset();
    for (const mock of [
      ...Object.values(sapB1Client),
      ...Object.values(receiptRequests),
    ]) {
      mock.mockReset();
    }
    prismaService = {
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      productionOrders: {
        findUnique: jest.fn(),
      },
      sapProductionReceiptRequests: receiptRequests,
      productionOrderFinishedProductSummaries: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderFinishedProductSummariesService,
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: SapB1ServiceLayerClient, useValue: sapB1Client },
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

  it('loads SAP receipts for the production order attached to the summary', async () => {
    const productionOrder = {
      id: 3353,
      item_code: 'TP001',
      lot_no: '001',
      production_order_code: 'TP001-001-3353',
    };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      {
        productionOrder,
      },
    );
    const receipts = [{ DocEntry: 2096, DocumentLines: [] }];
    sapB1Client.getProductionReceipts.mockResolvedValue(receipts);

    await expect(service.findSapProductionReceipts(7)).resolves.toBe(receipts);
    expect(sapB1Client.getProductionReceipts).toHaveBeenCalledWith(
      productionOrder,
    );
  });

  it('does not query SAP when the summary is absent or outside the current scope', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findSapProductionReceipts(7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(sapB1Client.getProductionReceipts).not.toHaveBeenCalled();
  });

  describe('posting production receipts', () => {
    const dto = {
      requestId: '8bc4d331-c62e-447a-8c6d-6fcd92a63179',
      postingDate: '2026-11-24',
      quantity: 2345,
      warehouseCode: 'K-TP',
      lotNumber: '1250926',
      manufacturingDate: '2026-09-25',
      expiryDate: '2028-09-25',
      comments: 'Nhập kho',
    };
    const sapReceipt = { DocEntry: 1875, DocNum: 1875 };
    beforeEach(() => {
      prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
        {
          productionOrder: {
            id: 3077,
            item_code: 'TP001',
            lot_no: dto.lotNumber,
          },
        },
      );
      receiptRequests.findUnique.mockResolvedValue(null);
      receiptRequests.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
          id: 4,
          sap_doc_entry: null,
          sap_doc_num: null,
        }),
      );
      sapB1Client.resolveProductionOrderEntry.mockResolvedValue(3120);
      sapB1Client.getReceiptItemTracking.mockResolvedValue({
        ManageBatchNumbers: 'tYES',
        ManageSerialNumbers: 'tNO',
      });
      sapB1Client.getProductionReceiptDistributionRules.mockResolvedValue([
        { FactorCode: 'KHKV', InWhichDimension: 1, Active: 'tYES' },
        { FactorCode: 'CP004', InWhichDimension: 2, Active: 'tYES' },
      ]);
      sapB1Client.postProductionReceipt.mockResolvedValue(sapReceipt);
    });

    it('posts the linked SAP internal order and the full quantity in its batch', async () => {
      await expect(service.createSapProductionReceipt(7, dto)).resolves.toEqual(
        sapReceipt,
      );
      expect(sapB1Client.postProductionReceipt).toHaveBeenCalledWith({
        DocDate: dto.postingDate,
        JournalMemo: 'Nhập kho sản xuất',
        Comments: dto.comments,
        Reference2: expect.stringMatching(/^W[A-Z0-9]{10}$/),
        DocumentLines: [
          {
            BaseType: 202,
            BaseEntry: 3120,
            Quantity: dto.quantity,
            WarehouseCode: 'K-TP',
            CostingCode: 'KHKV',
            CostingCode2: 'CP004',
            U_SL: dto.lotNumber,
            U_NSX: dto.manufacturingDate,
            U_HSD: dto.expiryDate,
            BatchNumbers: [
              {
                BatchNumber: dto.lotNumber,
                Quantity: dto.quantity,
                ManufacturingDate: dto.manufacturingDate,
                ExpiryDate: dto.expiryDate,
              },
            ],
          },
        ],
      });
      expect(receiptRequests.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { sap_doc_entry: 1875, sap_doc_num: 1875 },
      });
      expect(receiptRequests.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ summary_id: 7, active_summary_id: 7 }),
      });
    });

    it('posts the selected codes only in their SAP dimensions', async () => {
      const selected = {
        ...dto,
        departmentCode: 'KHO1',
        costItemCode: 'CP005',
      };
      sapB1Client.getProductionReceiptDistributionRules.mockResolvedValueOnce([
        { FactorCode: 'KHO1', InWhichDimension: 1, Active: 'tYES' },
        { FactorCode: 'CP005', InWhichDimension: 2, Active: 'tYES' },
      ]);
      await expect(
        service.createSapProductionReceipt(7, selected),
      ).resolves.toEqual(sapReceipt);
      expect(
        sapB1Client.getProductionReceiptDistributionRules,
      ).toHaveBeenCalledWith('KHO1', 'CP005');
      expect(sapB1Client.postProductionReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          DocumentLines: [
            expect.objectContaining({
              CostingCode: 'KHO1',
              CostingCode2: 'CP005',
            }),
          ],
        }),
      );
    });

    it('rejects swapped distribution dimensions before creating a receipt', async () => {
      await expect(
        service.createSapProductionReceipt(7, {
          ...dto,
          departmentCode: 'CP004',
          costItemCode: 'KHKV',
        }),
      ).rejects.toMatchObject({ status: 422 });
      expect(receiptRequests.create).not.toHaveBeenCalled();
      expect(sapB1Client.postProductionReceipt).not.toHaveBeenCalled();
    });

    it('blocks a new request for an already posted summary before calling SAP', async () => {
      receiptRequests.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          summary_id: 7,
          sap_doc_entry: 1875,
          sap_doc_num: 1875,
        });
      await expect(service.createSapProductionReceipt(7, dto)).rejects.toThrow(
        'Bản tổng kết đã nhập kho từ WMS qua phiếu SAP #1875.',
      );
      expect(sapB1Client.resolveProductionOrderEntry).not.toHaveBeenCalled();
      expect(sapB1Client.postProductionReceipt).not.toHaveBeenCalled();
    });

    it('blocks a concurrent submission with a different request key', async () => {
      receiptRequests.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          request_id: '23448c2b-75a5-4f5b-a626-c49337bddf20',
          summary_id: 7,
          sap_order_entry: 3120,
          sap_doc_entry: null,
          sap_doc_num: null,
        });
      receiptRequests.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );
      sapB1Client.getProductionReceiptsForEntry.mockResolvedValueOnce([]);
      await expect(service.createSapProductionReceipt(7, dto)).rejects.toThrow(
        'Bản tổng kết đang chờ kết quả nhập kho từ SAP.',
      );
      expect(sapB1Client.postProductionReceipt).not.toHaveBeenCalled();
    });

    it('reconciles an unconfirmed attempt without posting twice', async () => {
      sapB1Client.postProductionReceipt.mockRejectedValueOnce(
        new Error('timeout'),
      );
      sapB1Client.getProductionReceiptsForEntry.mockResolvedValueOnce([]);
      await expect(
        service.createSapProductionReceipt(7, dto),
      ).rejects.toMatchObject({ status: 503 });
      const reference =
        sapB1Client.postProductionReceipt.mock.calls[0][0].Reference2;
      receiptRequests.findUnique.mockResolvedValue(
        await receiptRequests.create.mock.results[0].value,
      );
      sapB1Client.getProductionReceiptsForEntry.mockResolvedValueOnce([
        { ...sapReceipt, Reference2: reference },
      ]);
      await expect(service.createSapProductionReceipt(7, dto)).resolves.toEqual(
        sapReceipt,
      );
      expect(
        sapB1Client.getProductionReceiptsForEntry,
      ).toHaveBeenLastCalledWith(3120, reference);
      expect(sapB1Client.postProductionReceipt).toHaveBeenCalledTimes(1);
    });

    it('returns the SAP rejection and releases the attempt for correction', async () => {
      sapB1Client.postProductionReceipt.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: { message: 'Posting period is locked' } },
        },
      });
      await expect(
        service.createSapProductionReceipt(7, dto),
      ).rejects.toMatchObject({
        status: 422,
        message: 'Posting period is locked',
      });
      expect(receiptRequests.delete).toHaveBeenCalledWith({ where: { id: 4 } });
    });
  });

  it('records the authenticated warehouse employee and server time only when unconfirmed', async () => {
    const row = {
      id: 7,
      warehouse_confirmed_by_id: 3,
      warehouse_confirmed_at: new Date(),
      productionOrder: { samplingRequests: [] },
    };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      row,
    );
    prismaService.productionOrderFinishedProductSummaries.updateMany.mockResolvedValue(
      { count: 1 },
    );
    await expect(service.confirmWarehouse(7, { id: 3 })).resolves.toMatchObject(
      {
        warehouse_confirmed_by_id: 3,
        warehouse_confirmed_at: row.warehouse_confirmed_at,
      },
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: 7, warehouse_confirmed_at: null },
      data: {
        warehouse_confirmed_by_id: 3,
        warehouse_confirmed_at: expect.any(Date),
      },
    });
  });

  it('returns the original confirmation when another employee retries', async () => {
    const row = {
      id: 7,
      warehouse_confirmed_by_id: 3,
      warehouse_confirmed_at: new Date('2026-11-18T09:00:00Z'),
      productionOrder: { samplingRequests: [] },
    };
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      row,
    );
    prismaService.productionOrderFinishedProductSummaries.updateMany.mockResolvedValue(
      { count: 0 },
    );
    await expect(service.confirmWarehouse(7, { id: 4 })).resolves.toMatchObject(
      {
        warehouse_confirmed_by_id: 3,
        warehouse_confirmed_at: row.warehouse_confirmed_at,
      },
    );
  });

  it('does not confirm a missing or inaccessible summary', async () => {
    prismaService.productionOrderFinishedProductSummaries.findUnique.mockResolvedValue(
      null,
    );
    await expect(service.confirmWarehouse(7, { id: 3 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('does not confirm without an authenticated employee', async () => {
    await expect(service.confirmWarehouse(7)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.updateMany,
    ).not.toHaveBeenCalled();
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

  it('searches the scoped summary projection, including the creator and latest PYCLM, without accents', async () => {
    const first = {
      id: 41,
      production_order_id: 2001,
      created_at: new Date('2026-11-15T08:00:00Z'),
      createdBy: { name: 'Nguyễn Văn Bình', department: 'Đảm bảo chất lượng' },
      productionOrder: {
        id: 2001,
        item_code: 'TP001',
        production_order_code: 'LSX-A',
        lot_no: 'LOT-A',
        item: { item_code: 'TP001', item_name: 'Vitamin C' },
        samplingRequests: [
          {
            status: 'sent',
            location: 'Kho thành phẩm',
            sender: { name: 'Trần Hà' },
          },
          {
            status: 'pending',
            location: 'Old location',
            sender: { name: 'Old sender' },
          },
        ],
      },
    };
    const second = {
      ...first,
      id: 42,
      production_order_id: 2002,
      createdBy: { name: 'Lê Minh', department: 'Sản xuất' },
      productionOrder: {
        ...first.productionOrder,
        production_order_code: 'LSX-B',
        item_code: 'TP002',
        lot_no: 'LOT-B',
        item: { item_name: 'Zinc' },
        samplingRequests: [],
      },
    };
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      [first, second],
    );
    for (const search of [
      '  LSX-A  ',
      'LOT-A',
      'vitamin',
      'TP001',
      '2001',
      '41',
      'nguyen van binh',
      'dam bao chat luong',
      'kho thanh pham',
      'tran ha',
      'da gui',
    ]) {
      expect((await service.findAll({ search })).map((row) => row.id)).toEqual([
        41,
      ]);
    }
    expect(
      (await service.findAll({ search: 'chua gui' })).map((row) => row.id),
    ).toEqual([42]);
    expect(await service.findAll({ search: 'old location' })).toEqual([]);
    expect(await service.findAll({ search: 'old sender' })).toEqual([]);
    expect(
      (await service.findAll({ search: '2026-11-15' })).map((row) => row.id),
    ).toEqual([41, 42]);
    expect(await service.findAll({ search: ' \n ' })).toHaveLength(2);
  });

  it('pages unfiltered rows in the database and counts the same scoped model', async () => {
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      [
        { id: 3, productionOrder: { samplingRequests: [] } },
        { id: 2, productionOrder: { samplingRequests: [] } },
      ],
    );
    prismaService.productionOrderFinishedProductSummaries.count.mockResolvedValue(
      5,
    );
    const result = await service.findPage({ page: 2, limit: 2 });
    expect(result).toMatchObject({ total: 5, page: 2, limit: 2 });
    expect(result.data.map((row) => row.id)).toEqual([3, 2]);
    expect(
      prismaService.productionOrderFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 2,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.count,
    ).toHaveBeenCalledTimes(1);
    expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    });
  });

  it('filters before paging and reports the filtered total even beyond the last page', async () => {
    const rows = Array.from({ length: 6 }, (_, index) => ({
      id: 6 - index,
      production_order_id: 2000 + index,
      created_at: new Date('2026-11-15T01:00:00Z'),
      createdBy: { name: index % 2 ? 'Nguyễn Văn Bình' : 'Lê Minh' },
      productionOrder: { item_code: 'TP001', samplingRequests: [] },
    }));
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      rows,
    );
    const result = await service.findPage({
      search: 'nguyen van binh',
      page: 2,
      limit: 2,
    });
    expect(result).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(result.data.map((row) => row.id)).toEqual([1]);
    expect(
      prismaService.productionOrderFinishedProductSummaries.findMany,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ skip: expect.any(Number) }),
    );
    expect(
      await service.findPage({ search: 'nguyen van binh', page: 99, limit: 2 }),
    ).toEqual({ data: [], total: 3, page: 99, limit: 2 });
    expect(
      await service.findPage({ search: 'not found', page: 1, limit: 20 }),
    ).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });

  it.each([
    [{ limit: 5 }, 1, 5],
    [{ page: 2 }, 2, 20],
  ] as const)(
    'supplies the missing pagination default for %j',
    async (options, page, limit) => {
      prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
        [],
      );
      expect(await service.findPage(options)).toEqual({
        data: [],
        total: 0,
        page,
        limit,
      });
      expect(
        prismaService.productionOrderFinishedProductSummaries.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ skip: (page - 1) * limit, take: limit }),
      );
    },
  );

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
      sap_production_receipt_number: null,
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
        where: { id: 1, warehouse_confirmed_at: null },
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
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, warehouse_confirmed_at: null },
      }),
    );
  });

  it.each(['update', 'delete'] as const)(
    'blocks %s when warehouse confirmation prevents the write',
    async (operation) => {
      const summaries = prismaService.productionOrderFinishedProductSummaries;
      summaries.findUnique.mockResolvedValue({ id: 1 });
      summaries[operation].mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('No matching record', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        operation === 'update'
          ? service.update(1, { package_count: 14 })
          : service.delete(1),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

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
