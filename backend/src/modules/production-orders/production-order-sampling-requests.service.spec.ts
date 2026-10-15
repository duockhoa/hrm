import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { FeaturesService } from '../features/features.service';
import {
  buildItemFeatureConfig,
  readFeatureConfigSnapshot,
} from '../features/item-feature-config';

jest.mock('axios');

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('ProductionOrderSamplingRequestsService', () => {
  let service: ProductionOrderSamplingRequestsService;
  const emailSettingsService = { resolveRecipients: jest.fn() };
  const featuresService = { findConfigByItemCode: jest.fn() };
  const config = buildItemFeatureConfig('TP00063', [
    {
      feature_id: 1,
      key: 'create_environment_check',
      kind: 'action',
      label: 'Tạo kiểm tra nhiệt độ/độ ẩm',
      group_name: null,
      order: 10,
      enabled: true,
      required: false,
    },
    {
      feature_id: 2,
      key: 'environment_checks',
      kind: 'section',
      label: 'Nhiệt độ/độ ẩm',
      group_name: null,
      order: 20,
      enabled: true,
      required: true,
    },
  ]);
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSamplingRequests: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    productionOrderSamplingRequests: { create: jest.Mock };
    productionOrderRegistrationNumbers: {
      upsert: jest.Mock;
    };
    productionOrderDocumentControls: {
      upsert: jest.Mock;
      update: jest.Mock;
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
    featuresService.findConfigByItemCode
      .mockReset()
      .mockImplementation((itemCode: string) =>
        buildItemFeatureConfig(itemCode, config.features),
      );

    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderSamplingRequests: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    tx = {
      productionOrderSamplingRequests: { create: jest.fn() },
      productionOrderRegistrationNumbers: {
        upsert: jest.fn(),
      },
      productionOrderDocumentControls: {
        upsert: jest.fn().mockResolvedValue({ feature_config_snapshot: null }),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSamplingRequestsService,
        { provide: EmailSettingsService, useValue: emailSettingsService },
        { provide: FeaturesService, useValue: featuresService },
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
    tx.productionOrderSamplingRequests.create.mockResolvedValue(
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
    expect(tx.productionOrderSamplingRequests.create).toHaveBeenCalledWith(
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
    expect(tx.productionOrderRegistrationNumbers.upsert).toHaveBeenCalledWith({
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
    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(featuresService.findConfigByItemCode).toHaveBeenCalledWith(
      'TP00063',
      undefined,
      tx,
    );
    expect(tx.productionOrderDocumentControls.upsert).toHaveBeenCalledWith({
      where: { production_order_id: 2031 },
      create: { production_order_id: 2031 },
      update: { production_order_id: 2031 },
      select: { feature_config_snapshot: true },
    });
    const sentAt = tx.productionOrderSamplingRequests.create.mock.calls[0][0]
      .data.sent_at as Date;
    expect(tx.productionOrderDocumentControls.update).toHaveBeenCalledWith({
      where: { production_order_id: 2031 },
      data: {
        feature_config_snapshot: {
          version: 1,
          source: 'pyclm',
          captured_at: sentAt.toISOString(),
          item_code: 'TP00063',
          features: config.features,
        },
      },
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
    tx.productionOrderSamplingRequests.create.mockResolvedValue({});

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
    expect(tx.productionOrderSamplingRequests.create).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
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
      tx.productionOrderSamplingRequests.create.mockResolvedValue({});

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
    tx.productionOrderSamplingRequests.create.mockResolvedValue(
      createdSamplingRequest,
    );

    const result = await service.create(2031, {}, { id: 7, name: 'Binh' });

    expect(mockedAxiosPost).toHaveBeenCalled();
    expect(tx.productionOrderSamplingRequests.create).toHaveBeenCalled();
    expect(tx.productionOrderRegistrationNumbers.upsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'success',
      samplingRequest: createdSamplingRequest,
    });
  });

  describe('feature configuration snapshots', () => {
    beforeEach(() => {
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
      mockedAxiosPost.mockResolvedValue({
        data: {
          status: 'success',
          url: 'https://docs.google.com/document/d/test',
        },
      });
      tx.productionOrderSamplingRequests.create.mockResolvedValue({ id: 1 });
    });

    it.each(['pyclm', 'issued', 'legacy'])(
      'preserves an existing %s snapshot when PYCLM is sent again',
      async (source) => {
        const original = {
          version: 1,
          source,
          item_code: 'TP00063',
          features: config.features,
        };
        tx.productionOrderDocumentControls.upsert.mockResolvedValue({
          feature_config_snapshot: original,
        });
        featuresService.findConfigByItemCode.mockResolvedValue(
          buildItemFeatureConfig('TP00063', []),
        );

        await service.create(2031, {}, { id: 7 });

        expect(tx.productionOrderSamplingRequests.create).toHaveBeenCalled();
        expect(featuresService.findConfigByItemCode).not.toHaveBeenCalled();
        expect(
          tx.productionOrderDocumentControls.update,
        ).not.toHaveBeenCalled();
        expect(readFeatureConfigSnapshot(original, 'TP00063')).toEqual({
          ...config,
          snapshot: { version: 1, source },
        });
      },
    );

    it('captures an empty configuration after the provider succeeds', async () => {
      featuresService.findConfigByItemCode.mockResolvedValue(
        buildItemFeatureConfig('TP00063', []),
      );
      mockedAxiosPost.mockImplementationOnce(async () => {
        expect(prismaService.$transaction).not.toHaveBeenCalled();
        expect(featuresService.findConfigByItemCode).not.toHaveBeenCalled();
        return {
          data: {
            status: 'success',
            url: 'https://docs.google.com/document/d/test',
          },
        };
      });

      await service.create(2031, {}, { id: 7 });

      expect(tx.productionOrderDocumentControls.update).toHaveBeenCalledWith({
        where: { production_order_id: 2031 },
        data: {
          feature_config_snapshot: expect.objectContaining({
            source: 'pyclm',
            item_code: 'TP00063',
            features: [],
          }),
        },
      });
    });

    it.each([
      ['a network failure', null],
      ['an error response', { status: 'error', message: 'Unable to send' }],
      ['a missing document URL', { status: 'success' }],
    ])('does not capture a snapshot after %s', async (_reason, response) => {
      if (response === null) {
        mockedAxiosPost.mockRejectedValue(new Error('Network failure'));
      } else {
        mockedAxiosPost.mockResolvedValue({ data: response });
      }

      await expect(service.create(2031, {}, { id: 7 })).rejects.toThrow();

      expect(prismaService.$transaction).not.toHaveBeenCalled();
      expect(featuresService.findConfigByItemCode).not.toHaveBeenCalled();
      expect(tx.productionOrderDocumentControls.upsert).not.toHaveBeenCalled();
      expect(tx.productionOrderDocumentControls.update).not.toHaveBeenCalled();
      expect(
        tx.productionOrderRegistrationNumbers.upsert,
      ).not.toHaveBeenCalled();
      expect(tx.productionOrderSamplingRequests.create).not.toHaveBeenCalled();
    });

    it('does not save a successful send when its feature snapshot cannot be stored', async () => {
      tx.productionOrderDocumentControls.update.mockRejectedValue(
        new Error('Snapshot write failed'),
      );

      await expect(service.create(2031, {}, { id: 7 })).rejects.toThrow(
        'Snapshot write failed',
      );

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(
        tx.productionOrderRegistrationNumbers.upsert,
      ).not.toHaveBeenCalled();
      expect(tx.productionOrderSamplingRequests.create).not.toHaveBeenCalled();
    });
  });
});
