import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ItemEquipmentService } from './item-equipment.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { MixingActivityTemplateStageStepParametersService } from './mixing-activity-template-stage-step-parameters.service';
import { MIXING_ACTIVITY_TEMPLATE_PERMISSIONS } from './mixing-activity-templates.permissions';
import { ItemsController } from './items.controller';
import { ITEM_PERMISSIONS } from './items.permissions';
import { ItemsService } from './items.service';

describe('ItemsController', () => {
  let controller: ItemsController;
  let itemsService: {
    findAll: jest.Mock;
    findFinishedProducts: jest.Mock;
    findSemiFinishedProducts: jest.Mock;
    findRawMaterials: jest.Mock;
    findItemByCode: jest.Mock;
    update: jest.Mock;
  };
  let itemEquipmentService: {
    findById: jest.Mock;
    findAllByItem: jest.Mock;
    create: jest.Mock;
    copyFromItem: jest.Mock;
    delete: jest.Mock;
  };
  let mixingActivityTemplatesService: {
    copyFromTemplate: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    findAllByItem: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mixingActivityTemplateStagesService: {
    findById: jest.Mock;
    findAllByTemplate: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mixingActivityTemplateStageStepsService: {
    findById: jest.Mock;
    findAllByStage: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mixingActivityTemplateStageStepParametersService: {
    findById: jest.Mock;
    findAllByStep: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    itemsService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findRawMaterials: jest.fn(),
      findItemByCode: jest.fn(),
      update: jest.fn(),
    };
    itemEquipmentService = {
      findById: jest.fn(),
      findAllByItem: jest.fn(),
      create: jest.fn(),
      copyFromItem: jest.fn(),
      delete: jest.fn(),
    };
    mixingActivityTemplatesService = {
      copyFromTemplate: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findAllByItem: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mixingActivityTemplateStagesService = {
      findById: jest.fn(),
      findAllByTemplate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mixingActivityTemplateStageStepsService = {
      findById: jest.fn(),
      findAllByStage: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mixingActivityTemplateStageStepParametersService = {
      findById: jest.fn(),
      findAllByStep: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: itemsService,
        },
        {
          provide: ItemEquipmentService,
          useValue: itemEquipmentService,
        },
        {
          provide: MixingActivityTemplatesService,
          useValue: mixingActivityTemplatesService,
        },
        {
          provide: MixingActivityTemplateStagesService,
          useValue: mixingActivityTemplateStagesService,
        },
        {
          provide: MixingActivityTemplateStageStepsService,
          useValue: mixingActivityTemplateStageStepsService,
        },
        {
          provide: MixingActivityTemplateStageStepParametersService,
          useValue: mixingActivityTemplateStageStepParametersService,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declares permission keys for item routes', () => {
    const metadata = (method: keyof ItemsController) =>
      Reflect.getMetadata(PERMISSIONS_KEY, controller[method]);

    [
      'findAll',
      'findFinishedProducts',
      'findSemiFinishedProducts',
      'findRawMaterials',
    ].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        ITEM_PERMISSIONS.LIST,
      ]),
    );
    ['findItemEquipmentById', 'findItemEquipment', 'findItemByCode'].forEach(
      (method) =>
        expect(metadata(method as keyof ItemsController)).toEqual([
          ITEM_PERMISSIONS.READ,
        ]),
    );
    ['createItemEquipment'].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        ITEM_PERMISSIONS.CREATE,
      ]),
    );
    ['updateItem', 'copyItemEquipment'].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        ITEM_PERMISSIONS.UPDATE,
      ]),
    );
    ['deleteItemEquipment'].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        ITEM_PERMISSIONS.DELETE,
      ]),
    );

    [
      'findAllMixingActivityTemplates',
      'findMixingActivityTemplateById',
      'findMixingActivityTemplateStageById',
      'findMixingActivityTemplateStageStepById',
      'findMixingActivityTemplateStageStepParameterById',
      'findMixingActivityTemplateStages',
      'findMixingActivityTemplateStageSteps',
      'findMixingActivityTemplateStageStepParameters',
      'findMixingActivityTemplates',
    ].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.READ,
      ]),
    );
    [
      'createMixingActivityTemplateStage',
      'createMixingActivityTemplateStageStep',
      'createMixingActivityTemplateStageStepParameter',
      'createMixingActivityTemplate',
      'copyMixingActivityTemplate',
    ].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.CREATE,
      ]),
    );
    [
      'updateMixingActivityTemplate',
      'updateMixingActivityTemplateStage',
      'updateMixingActivityTemplateStageStep',
      'updateMixingActivityTemplateStageStepParameter',
    ].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.UPDATE,
      ]),
    );
    [
      'deleteMixingActivityTemplate',
      'deleteMixingActivityTemplateStage',
      'deleteMixingActivityTemplateStageStep',
      'deleteMixingActivityTemplateStageStepParameter',
    ].forEach((method) =>
      expect(metadata(method as keyof ItemsController)).toEqual([
        MIXING_ACTIVITY_TEMPLATE_PERMISSIONS.DELETE,
      ]),
    );
  });

  it('copies a mixing template to the target item with the authenticated user', async () => {
    const dto = { source_template_id: 17, version: 3 };
    const user = { id: 9 };
    const result = { id: 22, item_code: 'BTP002', version: 3 };
    mixingActivityTemplatesService.copyFromTemplate.mockResolvedValue(result);

    await expect(
      controller.copyMixingActivityTemplate('BTP002', dto, { user }),
    ).resolves.toBe(result);
    expect(mixingActivityTemplatesService.copyFromTemplate).toHaveBeenCalledWith(
      'BTP002', dto, user,
    );
  });

  it('gets item detail by code', async () => {
    const item = {
      item_code: 'TP00001',
      productionSpecification: {
        productLine: {
          name: 'Line A',
        },
      },
    };
    itemsService.findItemByCode.mockResolvedValue(item);

    await expect(controller.findItemByCode('TP00001')).resolves.toBe(item);
    expect(itemsService.findItemByCode).toHaveBeenCalledWith('TP00001');
  });

  it('passes an optional item code prefix when listing items', async () => {
    const items = [{ item_code: 'BTP00001' }];
    itemsService.findAll.mockResolvedValue(items);

    await expect(controller.findAll('BTP')).resolves.toBe(items);
    expect(itemsService.findAll).toHaveBeenCalledWith('BTP');
  });

  it('gets all mixing activity templates with their items', async () => {
    const templates = [
      {
        id: 1,
        item_code: 'TP00001',
        item: { item_code: 'TP00001', item_name: 'Sản phẩm A' },
      },
    ];
    mixingActivityTemplatesService.findAll.mockResolvedValue(templates);

    await expect(controller.findAllMixingActivityTemplates()).resolves.toBe(
      templates,
    );
    expect(mixingActivityTemplatesService.findAll).toHaveBeenCalledTimes(1);
  });

  it('updates item registration_id', async () => {
    const result = {
      item_code: 'TP00001',
      registration_id: 583,
    };
    const dto = { registration_id: 583 };
    itemsService.update.mockResolvedValue(result);

    await expect(controller.updateItem('TP00001', dto)).resolves.toBe(result);
    expect(itemsService.update).toHaveBeenCalledWith('TP00001', dto);
  });

  it('adds equipment to an item using the authenticated user', async () => {
    const result = {
      id: 1,
      item_code: 'TP00001',
      equipment_id: 2,
    };
    const dto = { equipment_id: 2 };
    const user = { id: 7 };
    itemEquipmentService.create.mockResolvedValue(result);

    await expect(
      controller.createItemEquipment('TP00001', dto, { user }),
    ).resolves.toBe(result);
    expect(itemEquipmentService.create).toHaveBeenCalledWith(
      'TP00001',
      dto,
      user,
    );
  });

  it('copies equipment from another item using the authenticated user', async () => {
    const result = [{ id: 1, item_code: 'BTP00002', equipment_id: 2 }];
    const dto = { source_item_code: 'BTP00001' };
    const user = { id: 7 };
    itemEquipmentService.copyFromItem.mockResolvedValue(result);

    await expect(
      controller.copyItemEquipment('BTP00002', dto, { user }),
    ).resolves.toBe(result);
    expect(itemEquipmentService.copyFromItem).toHaveBeenCalledWith(
      'BTP00002',
      dto,
      user,
    );
  });
});
