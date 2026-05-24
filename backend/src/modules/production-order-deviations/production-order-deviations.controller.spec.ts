import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

describe('ProductionOrderDeviationsController', () => {
  let controller: ProductionOrderDeviationsController;
  let productionOrderDeviationsService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    productionOrderDeviationsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrderDeviationsController],
      providers: [
        {
          provide: ProductionOrderDeviationsService,
          useValue: productionOrderDeviationsService,
        },
      ],
    }).compile();

    controller = module.get<ProductionOrderDeviationsController>(
      ProductionOrderDeviationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes production order id query to service when listing', async () => {
    productionOrderDeviationsService.findAll.mockResolvedValue([]);

    await expect(controller.findAll('2031')).resolves.toEqual([]);
    expect(productionOrderDeviationsService.findAll).toHaveBeenCalledWith(
      '2031',
    );
  });
});
