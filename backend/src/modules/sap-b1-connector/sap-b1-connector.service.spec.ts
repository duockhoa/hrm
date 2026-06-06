import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { SapB1ConnectorService } from './sap-b1-connector.service';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('SapB1ConnectorService', () => {
  let service: SapB1ConnectorService;
  let prismaService: {
    items: {
      findUnique: jest.Mock;
    };
    productionOrders: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockedAxiosGet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapB1ConnectorService,
        {
          provide: PrismaService,
          useValue: {
            items: {
              findUnique: jest.fn(),
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

  it('syncs production order remarks from SAP', async () => {
    mockedAxiosGet.mockResolvedValue({
      data: [
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
          Remarks: 'Ghi chu san xuat',
        },
      ],
    });
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
      }),
      create: expect.objectContaining({
        id: 2031,
        remarks: 'Ghi chu san xuat',
      }),
    });
  });
});
