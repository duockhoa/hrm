import { Test, TestingModule } from '@nestjs/testing';
import { ItemEquipmentService } from './item-equipment.service';
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
  };
  let itemEquipmentService: {
    findById: jest.Mock;
    findAllByItem: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    itemsService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findRawMaterials: jest.fn(),
      findItemByCode: jest.fn(),
    };
    itemEquipmentService = {
      findById: jest.fn(),
      findAllByItem: jest.fn(),
      create: jest.fn(),
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
