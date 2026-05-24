import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

describe('ProductionOrderDeviationsController', () => {
  let controller: ProductionOrderDeviationsController;
  let productionOrderDeviationsService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    findImageFile: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    productionOrderDeviationsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findImageFile: jest.fn(),
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

  it('uses the uploaded deviation image paths when creating', async () => {
    const createdDeviation = {
      id: 1,
      deviation_images: [
        '/production-order-deviations/images/deviation-image.jpg',
        '/production-order-deviations/images/deviation-image-2.jpg',
      ],
    };

    productionOrderDeviationsService.create.mockResolvedValue(createdDeviation);

    await expect(
      controller.create(
        {
          production_order_id: '2031',
          deviation_content: 'Sai lech khoi luong',
          handling_plan: 'Kiem tra lai',
          reporter_id: '7',
        },
        {
          deviation_images: [
            {
              filename: 'deviation-image.jpg',
            } as Express.Multer.File,
            {
              filename: 'deviation-image-2.jpg',
            } as Express.Multer.File,
          ],
        },
      ),
    ).resolves.toEqual(createdDeviation);

    expect(productionOrderDeviationsService.create).toHaveBeenCalledWith({
      production_order_id: '2031',
      deviation_content: 'Sai lech khoi luong',
      handling_plan: 'Kiem tra lai',
      reporter_id: '7',
      deviation_images: [
        '/production-order-deviations/images/deviation-image.jpg',
        '/production-order-deviations/images/deviation-image-2.jpg',
      ],
    });
  });
});
