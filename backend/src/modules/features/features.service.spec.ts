import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from './features.service';

describe('FeaturesService', () => {
  let service: FeaturesService;
  let prismaService: {
    features: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    itemFeatures: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    items: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      features: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      itemFeatures: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      items: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prismaService.$transaction.mockImplementation((callback) =>
      callback(prismaService),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets all features ordered for display', async () => {
    const features = [{ id: 1, key: 'environment_checks', kind: 'section' }];
    prismaService.features.findMany.mockResolvedValue(features);

    await expect(service.findAll()).resolves.toEqual([
      { ...features[0], supports_required: true },
    ]);
    expect(prismaService.features.findMany).toHaveBeenCalledWith({
      orderBy: [{ default_order: 'asc' }, { key: 'asc' }],
    });
  });

  it('creates a feature with normalized data', async () => {
    const createdFeature = {
      id: 1,
      key: 'environment_checks',
      kind: 'section',
      label: 'Nhiệt độ/độ ẩm',
      default_order: 10,
    };

    prismaService.features.findUnique.mockResolvedValue(null);
    prismaService.features.create.mockResolvedValue(createdFeature);

    await expect(
      service.create({
        key: '  environment_checks  ',
        kind: '  section  ',
        label: '  Nhiệt độ/độ ẩm  ',
        default_order: '10',
      }),
    ).resolves.toBe(createdFeature);
    expect(prismaService.features.create).toHaveBeenCalledWith({
      data: {
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: null,
        default_order: 10,
      },
    });
  });

  it('throws ConflictException when feature key already exists', async () => {
    prismaService.features.findUnique.mockResolvedValue({
      id: 1,
      key: 'environment_checks',
    });

    await expect(
      service.create({
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaService.features.create).not.toHaveBeenCalled();
  });

  it('groups item features into frontend config', async () => {
    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.itemFeatures.findMany.mockResolvedValue([
      {
        feature_id: 1,
        enabled: true,
        required: false,
        order: null,
        feature: {
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: null,
          default_order: 10,
        },
      },
      {
        feature_id: 2,
        enabled: true,
        required: false,
        order: 20,
        feature: {
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: null,
          default_order: 10,
        },
      },
    ]);

    await expect(service.findConfigByItemCode('TP00001')).resolves.toEqual({
      item_code: 'TP00001',
      actions: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: null,
          order: 10,
          enabled: true,
          required: false,
        },
      ],
      sections: [
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: null,
          order: 20,
          enabled: true,
          required: false,
        },
      ],
      features: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
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
          required: false,
        },
      ],
    });
    expect(prismaService.itemFeatures.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          item_code: 'TP00001',
          enabled: true,
        },
      }),
    );
  });

  it('upserts an item feature by feature key', async () => {
    const upsertedItemFeature = {
      id: 1,
      item_code: 'TP00001',
      feature_id: 2,
      enabled: false,
      required: false,
      order: 10,
    };

    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
    });
    prismaService.itemFeatures.upsert.mockResolvedValue(upsertedItemFeature);

    await expect(
      service.upsertItemFeature('TP00001', {
        feature_key: 'environment_checks',
        enabled: 'false',
        order: '10',
      }),
    ).resolves.toBe(upsertedItemFeature);
    expect(prismaService.itemFeatures.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          item_code_feature_id: {
            item_code: 'TP00001',
            feature_id: 2,
          },
        },
        update: {
          enabled: false,
          required: false,
          order: 10,
        },
        create: {
          item_code: 'TP00001',
          feature_id: 2,
          enabled: false,
          required: false,
          order: 10,
        },
      }),
    );
  });

  it('copies every feature from the source in one transaction', async () => {
    prismaService.items.findFirst
      .mockResolvedValueOnce({ item_code: 'TP00001' })
      .mockResolvedValueOnce({ item_code: 'TP00002' });
    prismaService.features.findMany.mockResolvedValue([
      {
        id: 1,
        key: 'create_environment_check',
        kind: 'action',
        label: 'Nhập nhiệt độ/độ ẩm',
        group_name: 'Biểu mẫu chung',
        default_order: 10,
      },
      {
        id: 2,
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: 'Biểu mẫu chung',
        default_order: 20,
      },
    ]);
    prismaService.itemFeatures.findMany.mockResolvedValue([
      { feature_id: 1, enabled: true, order: null },
      { feature_id: 2, enabled: false, order: 30 },
    ]);
    prismaService.itemFeatures.deleteMany.mockResolvedValue({ count: 1 });
    prismaService.itemFeatures.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.copyItemFeatureConfig('TP00002', {
        source_item_code: 'TP00001',
      }),
    ).resolves.toEqual({
      item_code: 'TP00002',
      actions: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          group_name: 'Biểu mẫu chung',
          order: 10,
          enabled: true,
          required: false,
        },
      ],
      sections: [
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          group_name: 'Biểu mẫu chung',
          order: 30,
          enabled: false,
          required: false,
        },
      ],
      features: expect.any(Array),
    });
    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaService.itemFeatures.deleteMany).toHaveBeenCalledWith({
      where: { item_code: 'TP00002' },
    });
    expect(prismaService.itemFeatures.createMany).toHaveBeenCalledWith({
      data: [
        {
          item_code: 'TP00002',
          feature_id: 1,
          enabled: true,
          required: false,
          order: 10,
        },
        {
          item_code: 'TP00002',
          feature_id: 2,
          enabled: false,
          required: false,
          order: 30,
        },
      ],
    });
  });

  it('throws BadRequestException when updating item feature without data', async () => {
    prismaService.items.findFirst.mockResolvedValue({
      item_code: 'TP00001',
    });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      item_code: 'TP00001',
      feature_id: 2,
    });

    await expect(
      service.updateItemFeature('TP00001', 2, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.itemFeatures.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the item does not exist', async () => {
    prismaService.items.findFirst.mockResolvedValue(null);

    await expect(service.findByItemCode('TP00001')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaService.itemFeatures.findMany).not.toHaveBeenCalled();
  });

  it('keeps newly linked sections optional unless required is explicitly requested', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    await service.upsertItemFeature('TP00001', {
      feature_id: 2,
      enabled: true,
    });
    expect(prismaService.itemFeatures.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ enabled: true, required: false }),
        update: { enabled: true },
      }),
    );
  });

  it.each([
    ['action', 'create_environment_check'],
    ['section', 'unregistered_section'],
  ])('rejects required on unsupported %s %s', async (kind, key) => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({ id: 2, key, kind });
    await expect(
      service.upsertItemFeature('TP00001', {
        feature_id: 2,
        enabled: true,
        required: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.itemFeatures.upsert).not.toHaveBeenCalled();
  });

  it('requires a disabled section to be enabled before setting required', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: false,
      required: false,
    });
    await expect(
      service.upsertItemFeature('TP00001', {
        feature_id: 2,
        required: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears required when the section is disabled', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({ id: 2 });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: true,
      required: true,
    });
    await service.updateItemFeature('TP00001', 2, { enabled: false });
    expect(prismaService.itemFeatures.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enabled: false, required: false },
      }),
    );
  });

  it('writes enabled together with a required-only update', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findUnique.mockResolvedValue({
      id: 2,
      key: 'environment_checks',
      kind: 'section',
    });
    prismaService.itemFeatures.findUnique.mockResolvedValue({
      enabled: true,
      required: false,
    });
    await service.updateItemFeature('TP00001', 2, { required: true });
    expect(prismaService.itemFeatures.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { enabled: true, required: true },
      }),
    );
  });

  it('copies required sections and defaults unlinked features to optional', async () => {
    prismaService.items.findFirst.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.features.findMany.mockResolvedValue([
      {
        id: 1,
        key: 'environment_checks',
        kind: 'section',
        label: 'Nhiệt độ/độ ẩm',
        group_name: null,
        default_order: 10,
      },
      {
        id: 2,
        key: 'date_checks',
        kind: 'section',
        label: 'Kiểm tra date',
        group_name: null,
        default_order: 20,
      },
    ]);
    prismaService.itemFeatures.findMany.mockResolvedValue([
      { feature_id: 1, enabled: true, required: true },
    ]);
    const config = await service.copyItemFeatureConfig('TP00002', {
      source_item_code: 'TP00001',
    });
    expect(
      config.sections.map(({ enabled, required }) => ({ enabled, required })),
    ).toEqual([
      { enabled: true, required: true },
      { enabled: false, required: false },
    ]);
    expect(prismaService.itemFeatures.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ feature_id: 1, required: true }),
        ]),
      }),
    );
  });
});
