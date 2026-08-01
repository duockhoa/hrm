import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { SapB1ConnectorService } from './sap-b1-connector.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';

describe('SapB1ConnectorService', () => {
  let service: SapB1ConnectorService;
  let sapB1Client: {
    getItems: jest.Mock;
    getProductionOrders: jest.Mock;
    getProductionOrderById: jest.Mock;
    patchProductionOrderById: jest.Mock;
  };
  let prismaService: {
    items: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productionOrders: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    sapB1Client = {
      getItems: jest.fn(),
      getProductionOrders: jest.fn(),
      getProductionOrderById: jest.fn(),
      patchProductionOrderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapB1ConnectorService,
        {
          provide: SapB1ServiceLayerClient,
          useValue: sapB1Client,
        },
        {
          provide: PrismaService,
          useValue: {
            items: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            productionOrders: {
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SapB1ConnectorService>(SapB1ConnectorService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('syncs production order remarks and internal notes from SAP', async () => {
    sapB1Client.getProductionOrders.mockResolvedValue([
      {
        DocumentNumber: 2031,
        ItemNo: 'TP00063',
        PlannedQuantity: 1000,
        ProductionOrderStatus: 'Released',
        ProductionOrderType: 'Standard',
        CreationDate: '2026-05-08',
        ProductionOrderOrigin: 'Manual',
        Warehouse: 'K-KHKV',
        InventoryUOM: 'Vien',
        StartDate: '2026-05-08',
        ProductDescription: 'Thanh pham test',
        U_NSX: '2026-05-08',
        U_HSD: '2028-05-03',
        U_SL: '010126',
        U_QCHH: 'Hop 10 vi',
        U_MLSX: 'TP00063-1090526-2031',
        U_GC: 'Ghi chu noi bo',
        Remarks: 'Ghi chu san xuat',
      },
    ]);
    prismaService.items.findUnique.mockResolvedValue({
      item_code: 'TP00063',
    });
    prismaService.productionOrders.upsert.mockResolvedValue({});

    await service.handleCronSyncProductionOrders();

    expect(prismaService.productionOrders.upsert).toHaveBeenCalledWith({
      where: {
        id: 2031,
      },
      update: expect.objectContaining({
        remarks: 'Ghi chu san xuat',
        internal_notes: 'Ghi chu noi bo',
      }),
      create: expect.objectContaining({
        id: 2031,
        remarks: 'Ghi chu san xuat',
        internal_notes: 'Ghi chu noi bo',
      }),
    });
  });

  it('skips SAP items without item name', async () => {
    sapB1Client.getItems.mockResolvedValue([
      {
        ItemCode: 'BTP00606',
        ItemName: null,
        SalesUnit: 'Gói',
        U_MDK: null,
      },
    ]);

    await service.handleCronSyncItems();

    expect(prismaService.items.findUnique).not.toHaveBeenCalled();
    expect(prismaService.items.create).not.toHaveBeenCalled();
    expect(prismaService.items.update).not.toHaveBeenCalled();
  });

  it('skips SAP items with item code longer than the database column', async () => {
    sapB1Client.getItems.mockResolvedValue([
      {
        ItemCode: 'A'.repeat(192),
        ItemName: 'Item name',
        SalesUnit: 'Hộp',
        U_MDK: null,
      },
    ]);

    await service.handleCronSyncItems();

    expect(prismaService.items.findUnique).not.toHaveBeenCalled();
    expect(prismaService.items.create).not.toHaveBeenCalled();
    expect(prismaService.items.update).not.toHaveBeenCalled();
  });

  it('patches a SAP production order then syncs only that production order to the database', async () => {
    const patchBody = {
      Remarks: 'SCB: 31/26/CBMP-BN. HT BTP lô 1180726',
    };
    const syncedProductionOrder = {
      id: 2652,
      remarks: patchBody.Remarks,
    };

    sapB1Client.patchProductionOrderById.mockResolvedValue({
      message: 'Production order updated successfully',
    });
    sapB1Client.getProductionOrderById.mockResolvedValue({
      DocumentNumber: 2652,
      ItemNo: 'TP00666',
      PlannedQuantity: 10000,
      ProductionOrderStatus: 'boposReleased',
      ProductionOrderType: 'bopotStandard',
      CreationDate: '2026-08-01',
      ProductionOrderOrigin: 'bopooManual',
      Warehouse: 'K-TP',
      InventoryUOM: 'Hộp',
      StartDate: '2026-08-06',
      ProductDescription: 'MP Xịt răng miệng Midkid hương táo 20ml',
      U_NSX: '2026-08-05',
      U_HSD: '2029-08-05',
      U_SL: '1050826',
      U_QCHH: '20ml/lọ/hộp x 66 hộp/kiện',
      U_MLSX: 'TP00666-1050826-2652',
      U_GC: 'Xuất BBC2 cho HT MP Xịt răng miệng Midkid hương táo 20ml TP00666-1050826-2652',
      Remarks: patchBody.Remarks,
    });
    prismaService.items.findUnique.mockResolvedValue({
      item_code: 'TP00666',
    });
    prismaService.productionOrders.upsert.mockResolvedValue(
      syncedProductionOrder,
    );

    await expect(
      service.patchProductionOrderById(2652, patchBody),
    ).resolves.toEqual({
      message: 'Production order updated successfully',
      productionOrder: syncedProductionOrder,
    });

    expect(sapB1Client.patchProductionOrderById).toHaveBeenCalledWith(
      2652,
      patchBody,
    );
    expect(sapB1Client.getProductionOrderById).toHaveBeenCalledWith(2652);
    expect(sapB1Client.getProductionOrders).not.toHaveBeenCalled();
    expect(prismaService.productionOrders.upsert).toHaveBeenCalledWith({
      where: {
        id: 2652,
      },
      update: expect.objectContaining({
        remarks: patchBody.Remarks,
        internal_notes:
          'Xuất BBC2 cho HT MP Xịt răng miệng Midkid hương táo 20ml TP00666-1050826-2652',
      }),
      create: expect.objectContaining({
        id: 2652,
        remarks: patchBody.Remarks,
        internal_notes:
          'Xuất BBC2 cho HT MP Xịt răng miệng Midkid hương táo 20ml TP00666-1050826-2652',
      }),
    });
  });
});
