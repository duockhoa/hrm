import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { EmailSettingsService } from '../email-settings/email-settings.service';

jest.mock('axios');

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('ProductionOrderSamplingRequestsService', () => {
  let service: ProductionOrderSamplingRequestsService;
  const emailSettingsService = { resolveRecipients: jest.fn() };
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSamplingRequests: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    productionOrderRegistrationNumbers: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    process.env.APPS_SCRIPT_PYCLM_API_URL =
      'https://script.google.com/macros/s/test/exec';
    delete process.env.APPS_SCRIPT_PYCLM_TIMEOUT_MS;
    mockedAxiosPost.mockReset();
    emailSettingsService.resolveRecipients
      .mockReset()
      .mockResolvedValue(['binh@example.com']);

    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderSamplingRequests: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      productionOrderRegistrationNumbers: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSamplingRequestsService,
        { provide: EmailSettingsService, useValue: emailSettingsService },
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
        registration: {
          id: 583,
          registration_number: ' VD-12345-26 ',
        },
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
      { id: 7, name: 'Binh', email: 'binh@example.com' },
    );

    expect(emailSettingsService.resolveRecipients).toHaveBeenCalledWith(
      'sampling_request',
      7,
    );

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/test/exec',
      {
        itemCode: 'TP00063',
        itemName: 'Thanh pham test',
        registrationNum: 'VD-12345-26',
        quantity: '1000 kg',
        batchNumber: '010126',
        expiryDate: '030528',
        sender: 'Binh',
        location: 'Kiem nghiem',
        emailRecipients: 'binh@example.com',
        subjectPrefix: 'PYCLM THÀNH PHẨM',
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
    expect(
      prismaService.productionOrderRegistrationNumbers.upsert,
    ).toHaveBeenCalledWith({
      where: {
        production_order_id: 2031,
      },
      create: {
        production_order_id: 2031,
        registration_id: 583,
        registration_number: 'VD-12345-26',
      },
      update: {
        registration_id: 583,
        registration_number: 'VD-12345-26',
      },
    });
    expect(result).toEqual({
      status: 'success',
      samplingRequest: createdSamplingRequest,
    });
  });

  it('passes configured recipient lists to the sampling provider', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({
      id: 2031,
      item_code: 'TP00063',
      item: { item_name: 'Test', registration: null },
      planned_quatity: 1000,
      unit: 'kg',
      lot_no: '010126',
      expire_date: '2028-05-03',
      warehouse: 'Kho',
    });
    emailSettingsService.resolveRecipients.mockResolvedValue([
      'qc@example.com',
      'qa@example.com',
    ]);
    mockedAxiosPost.mockResolvedValue({
      data: {
        status: 'success',
        url: 'https://docs.google.com/document/d/test',
      },
    });
    prismaService.productionOrderSamplingRequests.create.mockResolvedValue({});

    await service.create(2031, {}, { id: 7, email: 'binh@example.com' });

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        emailRecipients: 'qc@example.com,qa@example.com',
      }),
      expect.any(Object),
    );
  });

  it('does not send or save a sampling request when recipients cannot be resolved', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    emailSettingsService.resolveRecipients.mockRejectedValue(
      new Error('Missing email'),
    );
    await expect(service.create(2031, {}, { id: 7 })).rejects.toThrow(
      'Missing email',
    );
    expect(mockedAxiosPost).not.toHaveBeenCalled();
    expect(
      prismaService.productionOrderSamplingRequests.create,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['BTP00063', 'PYCLM BÁN THÀNH PHẨM'],
    [' nl00063 ', 'PYCLM NGUYÊN LIỆU'],
    ['HH00063', undefined],
  ])(
    'sends the PYCLM email subject prefix for item code %s',
    async (itemCode, subjectPrefix) => {
      prismaService.productionOrders.findUnique.mockResolvedValue({
        id: 2031,
        item_code: itemCode,
        item: {
          item_name: 'San pham test',
          registration: null,
        },
        planned_quatity: 1000,
        unit: 'kg',
        description: 'Fallback name',
        lot_no: '010126',
        expire_date: '2028-05-03',
        warehouse: 'K-KHKV',
      });
      mockedAxiosPost.mockResolvedValue({
        data: {
          status: 'success',
          url: 'https://docs.google.com/document/d/test',
        },
      });
      prismaService.productionOrderSamplingRequests.create.mockResolvedValue(
        {},
      );

      await service.create(2031, {}, { id: 7, name: 'Binh' });

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ subjectPrefix }),
        expect.any(Object),
      );
    },
  );

  it('creates a new sampling request when an existing sent request is present', async () => {
    const createdSamplingRequest = {
      id: 1,
      production_order_id: 2031,
      status: 'sent',
      google_doc_url: 'https://docs.google.com/document/d/test',
    };

    prismaService.productionOrders.findUnique.mockResolvedValue({
      id: 2031,
      item_code: 'TP00063',
      item: {
        item_name: 'Thanh pham test',
        registration: null,
      },
      planned_quatity: 1000,
      unit: 'kg',
      description: 'Fallback name',
      lot_no: '010126',
      expire_date: '2028-05-03',
      warehouse: 'K-KHKV',
    });
    prismaService.productionOrderSamplingRequests.findFirst.mockResolvedValue(
      createdSamplingRequest,
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

    const result = await service.create(2031, {}, { id: 7, name: 'Binh' });

    expect(mockedAxiosPost).toHaveBeenCalled();
    expect(
      prismaService.productionOrderSamplingRequests.create,
    ).toHaveBeenCalled();
    expect(
      prismaService.productionOrderRegistrationNumbers.upsert,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'success',
      samplingRequest: createdSamplingRequest,
    });
  });
});
