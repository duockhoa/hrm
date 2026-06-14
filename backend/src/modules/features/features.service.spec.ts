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
    };
    items: {
      findFirst: jest.Mock;
    };
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
      },
      items: {
        findFirst: jest.fn(),
      },
    };

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
    const features = [{ id: 1, key: 'environment_checks' }];
    prismaService.features.findMany.mockResolvedValue(features);

    await expect(service.findAll()).resolves.toBe(features);
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
        order: null,
        feature: {
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          default_order: 10,
        },
      },
      {
        feature_id: 2,
        enabled: true,
        order: 20,
        feature: {
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
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
          order: 10,
          enabled: true,
        },
      ],
      sections: [
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          order: 20,
          enabled: true,
        },
      ],
      features: [
        {
          feature_id: 1,
          key: 'create_environment_check',
          kind: 'action',
          label: 'Nhập nhiệt độ/độ ẩm',
          order: 10,
          enabled: true,
        },
        {
          feature_id: 2,
          key: 'environment_checks',
          kind: 'section',
          label: 'Nhiệt độ/độ ẩm',
          order: 20,
          enabled: true,
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
          order: 10,
        },
        create: {
          item_code: 'TP00001',
          feature_id: 2,
          enabled: false,
          order: 10,
        },
      }),
    );
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
});
