import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';

jest.mock('axios');

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('ProductionOrderSamplingRequestsService', () => {
  let service: ProductionOrderSamplingRequestsService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSamplingRequests: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    process.env.APPS_SCRIPT_PYCLM_API_URL =
      'https://script.google.com/macros/s/test/exec';
    delete process.env.APPS_SCRIPT_PYCLM_TIMEOUT_MS;
    mockedAxiosPost.mockReset();

    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderSamplingRequests: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSamplingRequestsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderSamplingRequestsService>(
      ProductionOrderSamplingRequestsService,
    );
  });

  afterEach(() => {
    delete process.env.APPS_SCRIPT_PYCLM_API_URL;
    delete process.env.APPS_SCRIPT_PYCLM_TIMEOUT_MS;
  });

  it('creates a sampling request after calling the PYCLM Apps Script API', async () => {
    const productionOrder = {
      id: 2031,
      item_code: 'TP00063',
      item: {
        item_name: 'Thanh pham test',
      },
      planned_quatity: 1000,
      unit: 'kg',
      description: 'Fallback name',
      lot_no: '010126',
      expire_date: '2028-05-03',
      warehouse: 'K-KHKV',
    };
    const createdSamplingRequest = {
      id: 1,
      production_order_id: 2031,
      google_doc_url: 'https://docs.google.com/document/d/test',
      status: 'sent',
    };

    prismaService.productionOrders.findUnique.mockResolvedValue(
      productionOrder,
    );
    prismaService.productionOrderSamplingRequests.findFirst.mockResolvedValue(
      null,
    );
    mockedAxiosPost.mockResolvedValue({
      data: {
        status: 'success',
        url: 'https://docs.google.com/document/d/test',
      },
    });
    prismaService.productionOrderSamplingRequests.create.mockResolvedValue(
      createdSamplingRequest,
    );

    const result = await service.create(
      2031,
      { location: ' Kiem nghiem ' },
      { id: 7, name: 'Binh' },
    );

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/test/exec',
      {
        itemCode: 'TP00063',
        itemName: 'Thanh pham test',
        quantity: '1000 kg',
        batchNumber: '010126',
        expiryDate: '2028-05-03',
        sender: 'Binh',
        location: 'Kiem nghiem',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );
    expect(
      prismaService.productionOrderSamplingRequests.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          sender_id: 7,
          location: 'Kiem nghiem',
          google_doc_url: 'https://docs.google.com/document/d/test',
          status: 'sent',
          sent_at: expect.any(Date),
        },
      }),
    );
    expect(result).toEqual({
      status: 'success',
      samplingRequest: createdSamplingRequest,
    });
  });

  it('returns the existing sent sampling request unless resend is requested', async () => {
    const existingSamplingRequest = {
      id: 1,
      production_order_id: 2031,
      status: 'sent',
    };

    prismaService.productionOrders.findUnique.mockResolvedValue({
      id: 2031,
    });
    prismaService.productionOrderSamplingRequests.findFirst.mockResolvedValue(
      existingSamplingRequest,
    );

    const result = await service.create(2031, {}, { id: 7, name: 'Binh' });

    expect(mockedAxiosPost).not.toHaveBeenCalled();
    expect(
      prismaService.productionOrderSamplingRequests.create,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'already_sent',
      samplingRequest: existingSamplingRequest,
    });
  });
});
