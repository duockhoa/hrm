import { Test, TestingModule } from '@nestjs/testing';
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

  beforeEach(async () => {
    itemsService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findRawMaterials: jest.fn(),
      findItemByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: itemsService,
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
});
