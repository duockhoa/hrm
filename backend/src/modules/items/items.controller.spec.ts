import { Test, TestingModule } from '@nestjs/testing';
import { ItemEquipmentService } from './item-equipment.service';
import { MixingActivityTemplatesService } from './mixing-activity-templates.service';
import { MixingActivityTemplateStagesService } from './mixing-activity-template-stages.service';
import { MixingActivityTemplateStageStepsService } from './mixing-activity-template-stage-steps.service';
import { ItemsController } from './items.controller';
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
    delete: jest.Mock;
  };
  let mixingActivityTemplatesService: {
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
      delete: jest.fn(),
    };
    mixingActivityTemplatesService = {
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
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
});
