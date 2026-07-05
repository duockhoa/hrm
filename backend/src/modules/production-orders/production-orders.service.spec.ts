import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { WeighingTicketExportService } from './exports/weighing-ticket-export.service';
import { ProductionOrderExportService } from './exports/production-order-export.service';
import PizZip from 'pizzip';
import { FeaturesService } from '../features/features.service';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('ProductionOrdersService', () => {
  let service: ProductionOrdersService;
  let warehouseReleaseExportService: WarehouseReleaseExportService;
  let weighingTicketExportService: WeighingTicketExportService;
  let featuresService: {
    findConfigByItemCode: jest.Mock;
  };
  let prismaService: {
    productionOrders: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockedAxiosGet.mockReset();
    featuresService = {
      findConfigByItemCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        WarehouseReleaseExportService,
        WeighingTicketExportService,
        ProductionOrderExportService,
        {
          provide: FeaturesService,
          useValue: featuresService,
        },
        {
          provide: PrismaService,
          useValue: {
            productionOrders: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductionOrdersService>(ProductionOrdersService);
    warehouseReleaseExportService = module.get<WarehouseReleaseExportService>(
      WarehouseReleaseExportService,
    );
    weighingTicketExportService = module.get<WeighingTicketExportService>(
      WeighingTicketExportService,
    );
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns production orders with PYCLM sending info', async () => {
    const sentAt = new Date('2026-05-28T08:00:00.000Z');
    const sender = {
      id: 7,
      username: 'binh',
      name: 'Binh',
      email: 'binh@example.com',
      department: 'QA',
      position: 'Manager',
    };
    const latestSamplingRequest = {
      id: 1,
      production_order_id: 2031,
      sender_id: 7,
      sender,
      location: 'Kiem nghiem',
      google_doc_url: 'https://docs.google.com/document/d/test',
      status: 'sent',
      sent_at: sentAt,
    };
    const productionOrders = [
      {
        id: 2031,
        item_code: 'TP00001',
        internal_notes: 'Ghi chu noi bo TP',
        samplingRequests: [latestSamplingRequest],
      },
      {
        id: 2030,
        item_code: 'TP00002',
        internal_notes: null,
        samplingRequests: [],
      },
    ];
    prismaService.productionOrders.findMany.mockResolvedValue(productionOrders);

    await expect(service.findAll()).resolves.toEqual([
      {
        ...productionOrders[0],
        pyclm: {
          isSent: true,
          status: 'sent',
          googleDocUrl: 'https://docs.google.com/document/d/test',
          sentAt,
          location: 'Kiem nghiem',
          sender,
          latestSamplingRequest,
        },
      },
      {
        ...productionOrders[1],
        pyclm: {
          isSent: false,
          status: null,
          googleDocUrl: null,
          sentAt: null,
          location: null,
          sender: null,
          latestSamplingRequest: null,
        },
      },
    ]);
    expect(prismaService.productionOrders.findMany).toHaveBeenCalledWith({
      include: {
        item: true,
        samplingRequests: {
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  });

  it('returns production orders with TP item codes', async () => {
    const productionOrders = [
      { id: 2031, item_code: 'TP00001', samplingRequests: [] },
    ];
    prismaService.productionOrders.findMany.mockResolvedValue(productionOrders);

    await expect(service.findFinishedProducts()).resolves.toEqual([
      {
        ...productionOrders[0],
        pyclm: {
          isSent: false,
          status: null,
          googleDocUrl: null,
          sentAt: null,
          location: null,
          sender: null,
          latestSamplingRequest: null,
        },
      },
    ]);
    expect(prismaService.productionOrders.findMany).toHaveBeenCalledWith({
      where: {
        item_code: {
          startsWith: 'TP',
        },
      },
      include: {
        item: true,
        samplingRequests: {
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  });

  it('returns production orders without TP item codes', async () => {
    const productionOrders = [
      { id: 2031, item_code: 'BTP00001', samplingRequests: [] },
      { id: 2032, item_code: 'NVL00001', samplingRequests: [] },
    ];
    prismaService.productionOrders.findMany.mockResolvedValue(productionOrders);

    await expect(service.findSemiFinishedProducts()).resolves.toEqual([
      {
        ...productionOrders[0],
        pyclm: {
          isSent: false,
          status: null,
          googleDocUrl: null,
          sentAt: null,
          location: null,
          sender: null,
          latestSamplingRequest: null,
        },
      },
      {
        ...productionOrders[1],
        pyclm: {
          isSent: false,
          status: null,
          googleDocUrl: null,
          sentAt: null,
          location: null,
          sender: null,
          latestSamplingRequest: null,
        },
      },
    ]);
    expect(prismaService.productionOrders.findMany).toHaveBeenCalledWith({
      where: {
        item_code: {
          not: {
            startsWith: 'TP',
          },
        },
      },
      include: {
        item: true,
        samplingRequests: {
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  });

  it('returns a production order by id with PYCLM sending info', async () => {
    const sentAt = new Date('2026-05-28T08:00:00.000Z');
    const sender = {
      id: 7,
      username: 'binh',
      name: 'Binh',
      email: 'binh@example.com',
      department: 'QA',
      position: 'Manager',
    };
    const latestSamplingRequest = {
      id: 1,
      production_order_id: 2031,
      sender_id: 7,
      sender,
      location: 'Kiem nghiem',
      google_doc_url: 'https://docs.google.com/document/d/test',
      status: 'sent',
      sent_at: sentAt,
    };
    const productionOrder = {
      id: 2031,
      item_code: 'TP00001',
      internal_notes: 'Ghi chu noi bo TP',
      samplingRequests: [latestSamplingRequest],
    };
    const featureConfig = {
      item_code: 'TP00001',
      actions: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          order: 10,
          enabled: true,
        },
      ],
      sections: [],
      features: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          order: 10,
          enabled: true,
        },
      ],
    };
    prismaService.productionOrders.findUnique.mockResolvedValue(
      productionOrder,
    );
    featuresService.findConfigByItemCode.mockResolvedValue(featureConfig);

    await expect(service.findProductionOrderById(2031)).resolves.toEqual({
      ...productionOrder,
      pyclm: {
        isSent: true,
        status: 'sent',
        googleDocUrl: 'https://docs.google.com/document/d/test',
        sentAt,
        location: 'Kiem nghiem',
        sender,
        latestSamplingRequest,
      },
      featureConfig,
    });
    expect(prismaService.productionOrders.findUnique).toHaveBeenCalledWith({
      where: {
        id: 2031,
      },
      include: {
        item: true,
        samplingRequests: {
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });
    expect(featuresService.findConfigByItemCode).toHaveBeenCalledWith(
      'TP00001',
    );
  });

  it('returns production order lines joined with production order stages', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        ProductionOrderLines: [
          {
            LineNumber: 0,
            ItemNo: 'MMCC5',
            StageID: 1,
            UoMEntry: 160,
          },
          {
            LineNumber: 7,
            ItemNo: 'BB00075',
            StageID: 2,
            UoMEntry: 172,
          },
          {
            LineNumber: 99,
            ItemNo: 'UNKNOWN',
            StageID: 999,
            UoMEntry: 999,
          },
        ],
        ProductionOrdersStages: [
          {
            StageID: 1,
            Name: 'Nguồn lực',
          },
          {
            StageID: 2,
            Name: 'Đóng gói',
          },
        ],
      },
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        {
          AbsEntry: 160,
          Code: 'kg',
          Name: 'kg',
        },
        {
          AbsEntry: 172,
          Code: 'Cái',
          Name: 'Cái',
        },
      ],
    });

    await expect(service.findProductionOrderLines(2031)).resolves.toEqual([
      {
        LineNumber: 0,
        ItemNo: 'MMCC5',
        StageID: 1,
        UoMEntry: 160,
        ProductionOrdersStage: {
          StageID: 1,
          Name: 'Nguồn lực',
        },
        UnitOfMeasurement: {
          AbsEntry: 160,
          Code: 'kg',
          Name: 'kg',
        },
      },
      {
        LineNumber: 7,
        ItemNo: 'BB00075',
        StageID: 2,
        UoMEntry: 172,
        ProductionOrdersStage: {
          StageID: 2,
          Name: 'Đóng gói',
        },
        UnitOfMeasurement: {
          AbsEntry: 172,
          Code: 'Cái',
          Name: 'Cái',
        },
      },
      {
        LineNumber: 99,
        ItemNo: 'UNKNOWN',
        StageID: 999,
        UoMEntry: 999,
        ProductionOrdersStage: null,
        UnitOfMeasurement: null,
      },
    ]);
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      1,
      'https://sap-b1-connector.dkpharma.io.vn/production-orders/2031',
    );
    expect(mockedAxiosGet).toHaveBeenNthCalledWith(
      2,
      'https://sap-b1-connector.dkpharma.io.vn/unit-of-measurements',
    );
  });

  it('exports a finished product production order to a docx buffer', async () => {
    const productionOrder = {
      id: 2031,
      item_code: 'TPEGU01',
      status: 'R',
      type: 'S',
      planned_quatity: 10000,
      creation_date: new Date('2026-01-20T00:00:00.000Z'),
      origin: null,
      warehouse: 'K-TP',
      unit: 'Lọ',
      start_date: new Date('2026-01-26T00:00:00.000Z'),
      description: 'EUCIGA 5 ml',
      date_manufacture: '2026-01-26',
      expire_date: '2029-01-26',
      lot_no: '0030126',
      packing_specification: '5ml/goi x 30 goi/hop x 30 hop/kien',
      production_order_code: 'LPC3/TPEUG01-003/2026',
      remarks: 'The tich pha che: 1060 L',
      item: {
        item_code: 'TPEGU01',
        item_name: 'EUCIGA 5 ml',
        unit: 'Hop',
        dk_code: null,
        registration_id: null,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        update_at: new Date('2026-01-01T00:00:00.000Z'),
        deleted_at: null,
      },
    };
    prismaService.productionOrders.findUnique.mockResolvedValue(
      productionOrder,
    );

    const exportedFile = await service.exportProductionOrder(2031);

    expect(prismaService.productionOrders.findUnique).toHaveBeenCalledWith({
      where: {
        id: 2031,
      },
      include: {
        item: true,
      },
    });
    expect(exportedFile.filename).toBe(
      'Lenh san xuat EUCIGA 5 ml 0030126.docx',
    );
    expect(exportedFile.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(Buffer.isBuffer(exportedFile.buffer)).toBe(true);

    const documentXml = new PizZip(exportedFile.buffer)
      .file('word/document.xml')
      ?.asText();

    expect(documentXml).toContain('TPEGU01');
    expect(documentXml).toContain('EUCIGA 5 ml');
    expect(documentXml).toContain('LPC3/TPEUG01-003/2026');
    expect(documentXml).toContain('10.000 lọ');
    expect(documentXml).toContain('260126');
    expect(documentXml).toContain('260129');
    expect(documentXml).not.toContain('TGĐ Sản xuất');
    expect(documentXml).not.toContain('{{item_code}}');
  });

  it('exports a semi-finished product production order with the BTP template', async () => {
    const productionOrder = {
      id: 2032,
      item_code: 'BTP00001',
      status: 'R',
      type: 'S',
      planned_quatity: 500,
      creation_date: new Date('2026-06-01T00:00:00.000Z'),
      origin: null,
      warehouse: 'K-BTP',
      unit: 'Kg',
      start_date: new Date('2026-06-02T00:00:00.000Z'),
      description: 'Bán thành phẩm test',
      date_manufacture: '2026-06-02',
      expire_date: '2027-06-02',
      lot_no: '0010626',
      packing_specification: null,
      production_order_code: 'LSX/BTP00001-001/2026',
      remarks: null,
      item: {
        item_code: 'BTP00001',
        item_name: 'Bán thành phẩm test',
        unit: 'Kg',
        dk_code: null,
        registration_id: null,
        created_at: new Date('2026-06-01T00:00:00.000Z'),
        update_at: new Date('2026-06-01T00:00:00.000Z'),
        deleted_at: null,
      },
    };
    prismaService.productionOrders.findUnique.mockResolvedValue(
      productionOrder,
    );

    const exportedFile = await service.exportProductionOrder(2032);

    expect(prismaService.productionOrders.findUnique).toHaveBeenCalledWith({
      where: {
        id: 2032,
      },
      include: {
        item: true,
      },
    });
    expect(exportedFile.filename).toBe(
      'Lenh san xuat Bán thành phẩm test 0010626.docx',
    );
    expect(Buffer.isBuffer(exportedFile.buffer)).toBe(true);

    const documentXml = new PizZip(exportedFile.buffer)
      .file('word/document.xml')
      ?.asText();

    expect(documentXml).toContain('BTP00001');
    expect(documentXml).toContain('Bán thành phẩm test');
    expect(documentXml).toContain('LSX/BTP00001-001/2026');
    expect(documentXml).toContain('500 kg');
    expect(documentXml).toContain('020626');
    expect(documentXml).toContain('020627');
    expect(documentXml).toContain('TGĐ Sản xuất');
    expect(documentXml).not.toContain('{{item_code}}');
  });

  it('exports production order lines to an xlsx buffer', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        ItemNo: 'TP00063',
        PlannedQuantity: 1000,
        ProductDescription: 'Thanh pham test',
        U_SL: '010126',
        U_MLSX: 'TP00063-1090526-2031',
        ProductionOrderLines: [
          {
            DocumentAbsoluteEntry: 2031,
            LineNumber: 7,
            VisualOrder: 7,
            ItemNo: 'BB00075',
            ItemName:
              'Bang dinh in logo Duoc Khoa loai dai dung cho dong goi thanh pham',
            ItemType: 'pit_Item',
            StageID: 2,
            UoMEntry: 172,
            PlannedQuantity: 1.5,
            Warehouse: 'K-KHKV',
            StartDate: '2026-05-08',
            U_SL: '010126',
            U_HSD: '2028-05-03',
          },
          {
            DocumentAbsoluteEntry: 2031,
            LineNumber: 8,
            VisualOrder: 8,
            ItemNo: 'BB00076',
            ItemName: 'Mang nhom',
            ItemType: 'pit_Item',
            StageID: 3,
            UoMEntry: 172,
            PlannedQuantity: 2,
            Warehouse: 'K-KHKV',
            StartDate: '2026-05-08',
            U_SL: '010126-A001',
            U_HSD: '2028-05-03',
          },
        ],
        ProductionOrdersStages: [
          {
            StageID: 2,
            Name: 'Dong goi',
          },
          {
            StageID: 3,
            Name: 'Xu ly bao bi',
          },
        ],
      },
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        {
          AbsEntry: 172,
          Code: 'Cai',
          Name: 'Cai',
        },
      ],
    });

    const exportedFile = await service.exportProductionOrderLines(2031);

    expect(exportedFile.filename).toBe('PXK Thanh pham test 010126.xlsx');
    expect(exportedFile.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(Buffer.isBuffer(exportedFile.buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exportedFile.buffer);
    const worksheet = workbook.getWorksheet('Page1');

    expect(worksheet).toBeDefined();
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    expect(worksheet.getCell('D5').value).toBe('PHIẾU XUẤT KHO');
    expect(worksheet.getCell('K6').value).toBe('Ngày 08 tháng 05 năm 2026');
    expect(worksheet.getCell('K7').value).toBe('Số: TP00063-1090526-2031');
    expect(worksheet.getCell('A11').value).toBe(
      '- Lý do xuất: Xuất nguyên vật liệu cho Dong goi + Xu ly bao bi Thanh pham test (1000) TP00063 - 010126',
    );
    expect(worksheet.getCell('A12').value).toBe(
      '- Xuất tại kho (ngăn lô): K-KHKV',
    );
    expect(worksheet.getCell('Z115').value).toBeNull();
    expect(worksheet.getCell('A16').value).toBe(1);
    expect(worksheet.getCell('B16').value).toBe('BB00075');
    expect(worksheet.getCell('D16').value).toBe(
      'Bang dinh in logo Duoc Khoa loai dai dung cho dong goi thanh pham',
    );
    expect(worksheet.getCell('H16').value).toBe('010126');
    expect(worksheet.getCell('J16').value).toBe('03/05/2028');
    expect(worksheet.getCell('L16').value).toBe('K-KHKV');
    expect(worksheet.getCell('N16').value).toBe('Cai');
    expect(worksheet.getCell('O16').value).toBe(1.5);
    expect(worksheet.getCell('AB16').value).toBeNull();
    expect(worksheet.getCell('O114').value).toBeNull();
    expect(worksheet.getRow(16).height).toBeGreaterThan(20.25);
    expect(worksheet.getCell('H17').value).toBe('010126-A001');
    expect(worksheet.getRow(17).height).toBe(27.5);
    expect(worksheet.getRow(18).hidden).toBe(true);
  });

  it('filters exported production order lines by stage ids', async () => {
    const productionOrder = {
      ItemNo: 'TP00063',
      PlannedQuantity: 1000,
      ProductDescription: 'Thanh pham test',
      U_SL: '010126',
      U_MLSX: 'TP00063-1090526-2031',
      ProductionOrderLines: [
        {
          LineNumber: 7,
          VisualOrder: 7,
          ItemNo: 'BB00075',
          ItemType: 'pit_Item',
          StageID: 2,
          UoMEntry: 172,
        },
        {
          LineNumber: 8,
          VisualOrder: 8,
          ItemNo: 'BB00076',
          ItemType: 'pit_Item',
          StageID: 3,
          UoMEntry: 173,
        },
      ],
      ProductionOrdersStages: [
        {
          StageID: 2,
          Name: 'Dong goi',
        },
        {
          StageID: 3,
          Name: 'Kiem nghiem',
        },
      ],
    };
    mockedAxiosGet.mockResolvedValueOnce({
      data: productionOrder,
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        {
          AbsEntry: 172,
          Code: 'Cai',
          Name: 'Cai',
        },
        {
          AbsEntry: 173,
          Code: 'Hop',
          Name: 'Hop',
        },
      ],
    });
    const exportSpy = jest
      .spyOn(warehouseReleaseExportService, 'export')
      .mockResolvedValue({
        buffer: Buffer.from('xlsx-content'),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'warehouse-release-order-2031.xlsx',
      });

    await service.exportProductionOrderLines(2031, { StageID: [2] });

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const [, exportedLines] = exportSpy.mock.calls[0];
    expect(exportedLines).toHaveLength(1);
    expect(exportedLines[0]).toEqual(
      expect.objectContaining({
        ItemNo: 'BB00075',
        StageID: 2,
      }),
    );
  });

  it('exports production order lines to a weighing ticket xlsx buffer', async () => {
    mockedAxiosGet.mockResolvedValueOnce({
      data: {
        ItemNo: 'TP00063',
        PlannedQuantity: 1000,
        ProductDescription: 'Thanh pham test',
        U_SL: '010126',
        ProductionOrderLines: [
          {
            DocumentAbsoluteEntry: 2031,
            LineNumber: 7,
            VisualOrder: 7,
            ItemNo: 'BB00075',
            ItemName:
              'Bang dinh in logo Duoc Khoa loai dai dung cho dong goi thanh pham',
            ItemType: 'pit_Item',
            StageID: 2,
            UoMEntry: 172,
            PlannedQuantity: 1.5,
            StartDate: '2026-05-08',
            U_SL: '010126',
          },
          {
            DocumentAbsoluteEntry: 2031,
            LineNumber: 8,
            VisualOrder: 8,
            ItemNo: 'BB00076',
            ItemName: 'Mang nhom',
            ItemType: 'pit_Item',
            StageID: 3,
            UoMEntry: 172,
            PlannedQuantity: 2,
            StartDate: '2026-05-08',
            U_SL: '010126-A001',
          },
        ],
        ProductionOrdersStages: [
          {
            StageID: 2,
            Name: 'Dong goi',
          },
          {
            StageID: 3,
            Name: 'Xu ly bao bi',
          },
        ],
      },
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        {
          AbsEntry: 172,
          Code: 'Cai',
          Name: 'Cai',
        },
      ],
    });

    const exportedFile = await service.exportWeighingTicket(2031);

    expect(exportedFile.filename).toBe('Phieu can Thanh pham test 010126.xlsx');
    expect(exportedFile.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(Buffer.isBuffer(exportedFile.buffer)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exportedFile.buffer);
    const worksheet = workbook.getWorksheet('Sheet1');

    expect(worksheet).toBeDefined();
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    expect(worksheet.getCell('E1').value).toBe('PHIẾU CÂN');
    expect(worksheet.getCell('D5').value).toBe('Thanh pham test');
    expect(worksheet.getCell('L5').value).toBe('010126');
    expect(worksheet.getCell('D6').value).toBe(1000);
    expect(worksheet.getCell('L6').value).toBe('......./....../20…....');
    expect(worksheet.getCell('B12').value).toBe('BB00075');
    expect(worksheet.getCell('C12').value).toBe(
      'Bang dinh in logo Duoc Khoa loai dai dung cho dong goi thanh pham',
    );
    expect(worksheet.getCell('G12').value).toBe('010126');
    expect(worksheet.getCell('K12').value).toBe(1.5);
    expect(worksheet.getCell('M12').value).toBe('Cai');
    expect(worksheet.getCell('N12').value).toBeNull();
    expect(worksheet.getRow(12).height).toBeGreaterThanOrEqual(46);
    expect(worksheet.getRow(12).height).toBeLessThan(51);
    expect(worksheet.getCell('B12').alignment).toEqual(
      expect.objectContaining({
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }),
    );
    expect(worksheet.getCell('C12').alignment).toEqual(
      expect.objectContaining({
        horizontal: 'left',
        vertical: 'middle',
        wrapText: true,
      }),
    );
    expect(worksheet.getCell('G12').alignment).toEqual(
      expect.objectContaining({
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }),
    );
    expect(worksheet.getCell('M12').alignment).toEqual(
      expect.objectContaining({
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }),
    );
    expect(worksheet.getCell('G13').value).toBe('010126-A001');
    expect(worksheet.getRow(13).height).toBeGreaterThan(21);
    expect(worksheet.getRow(13).height).toBeLessThan(23);
    expect(worksheet.getRow(14).hidden).toBe(true);
  });

  it('filters exported weighing ticket lines by stage ids', async () => {
    const productionOrder = {
      ItemNo: 'TP00063',
      PlannedQuantity: 1000,
      ProductDescription: 'Thanh pham test',
      U_SL: '010126',
      ProductionOrderLines: [
        {
          LineNumber: 7,
          VisualOrder: 7,
          ItemNo: 'BB00075',
          ItemType: 'pit_Item',
          StageID: 2,
          UoMEntry: 172,
        },
        {
          LineNumber: 8,
          VisualOrder: 8,
          ItemNo: 'BB00076',
          ItemType: 'pit_Item',
          StageID: 3,
          UoMEntry: 173,
        },
      ],
      ProductionOrdersStages: [
        {
          StageID: 2,
          Name: 'Dong goi',
        },
        {
          StageID: 3,
          Name: 'Kiem nghiem',
        },
      ],
    };
    mockedAxiosGet.mockResolvedValueOnce({
      data: productionOrder,
    });
    mockedAxiosGet.mockResolvedValueOnce({
      data: [
        {
          AbsEntry: 172,
          Code: 'Cai',
          Name: 'Cai',
        },
        {
          AbsEntry: 173,
          Code: 'Hop',
          Name: 'Hop',
        },
      ],
    });
    const exportSpy = jest
      .spyOn(weighingTicketExportService, 'export')
      .mockResolvedValue({
        buffer: Buffer.from('xlsx-content'),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'weighing-ticket-order-2031.xlsx',
      });

    await service.exportWeighingTicket(2031, { StageID: [2] });

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const [, exportedLines] = exportSpy.mock.calls[0];
    expect(exportedLines).toHaveLength(1);
    expect(exportedLines[0]).toEqual(
      expect.objectContaining({
        ItemNo: 'BB00075',
        StageID: 2,
      }),
    );
  });
});
