import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';

jest.mock('axios');

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

describe('ProductionOrdersService', () => {
  let service: ProductionOrdersService;

  beforeEach(async () => {
    mockedAxiosGet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
});
