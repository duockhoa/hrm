import { Test, TestingModule } from '@nestjs/testing';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

describe('FeaturesController', () => {
  let controller: FeaturesController;
  let featuresService: {
    findAll: jest.Mock;
    findByItemCode: jest.Mock;
    findConfigByItemCode: jest.Mock;
    findByKey: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    upsertItemFeature: jest.Mock;
    updateItemFeature: jest.Mock;
    deleteItemFeature: jest.Mock;
  };

  beforeEach(async () => {
    featuresService = {
      findAll: jest.fn(),
      findByItemCode: jest.fn(),
      findConfigByItemCode: jest.fn(),
      findByKey: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsertItemFeature: jest.fn(),
      updateItemFeature: jest.fn(),
      deleteItemFeature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturesController],
      providers: [
        {
          provide: FeaturesService,
          useValue: featuresService,
        },
      ],
    }).compile();

    controller = module.get<FeaturesController>(FeaturesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gets all features', async () => {
    const features = [{ id: 1, key: 'environment_checks' }];
    featuresService.findAll.mockResolvedValue(features);

    await expect(controller.findAll()).resolves.toBe(features);
    expect(featuresService.findAll).toHaveBeenCalledWith();
  });

  it('passes item code and includeDisabled query when getting item features', async () => {
    const itemFeatures = [{ id: 1, item_code: 'TP00001', feature_id: 2 }];
    featuresService.findByItemCode.mockResolvedValue(itemFeatures);

    await expect(controller.findByItemCode('TP00001', 'true')).resolves.toBe(
      itemFeatures,
    );
    expect(featuresService.findByItemCode).toHaveBeenCalledWith(
      'TP00001',
      'true',
    );
  });

  it('gets frontend config for an item', async () => {
    const config = {
      item_code: 'TP00001',
      actions: [],
      sections: [],
      features: [],
    };
    featuresService.findConfigByItemCode.mockResolvedValue(config);

    await expect(
      controller.findConfigByItemCode('TP00001', undefined),
    ).resolves.toBe(config);
    expect(featuresService.findConfigByItemCode).toHaveBeenCalledWith(
      'TP00001',
      undefined,
    );
  });

  it('creates a feature', async () => {
    const createdFeature = { id: 1, key: 'environment_checks' };
    const dto = {
      key: 'environment_checks',
      kind: 'section',
      label: 'Nhiệt độ/độ ẩm',
    };
    featuresService.create.mockResolvedValue(createdFeature);

    await expect(controller.create(dto)).resolves.toBe(createdFeature);
    expect(featuresService.create).toHaveBeenCalledWith(dto);
  });

  it('upserts an item feature', async () => {
    const dto = {
      feature_key: 'environment_checks',
      enabled: true,
      order: 10,
    };
    const itemFeature = { id: 1, item_code: 'TP00001', feature_id: 2 };
    featuresService.upsertItemFeature.mockResolvedValue(itemFeature);

    await expect(controller.upsertItemFeature('TP00001', dto)).resolves.toBe(
      itemFeature,
    );
    expect(featuresService.upsertItemFeature).toHaveBeenCalledWith(
      'TP00001',
      dto,
    );
  });
});
