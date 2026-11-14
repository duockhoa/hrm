import { Test, TestingModule } from '@nestjs/testing';
import { NetworkPolicyGuard } from 'src/guards/network-policy.guard';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from './production-order-deviations.permissions';
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
    })
      .overrideGuard(NetworkPolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductionOrderDeviationsController>(
      ProductionOrderDeviationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declares permission keys for production-order deviation routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.LIST,
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getDeviationImage),
    ).toEqual([PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.DELETE,
    ]);
  });

  it('passes production order id query to service when listing', async () => {
    productionOrderDeviationsService.findAll.mockResolvedValue([]);

    await expect(controller.findAll({ production_order_id: 2031 })).resolves.toEqual([]);
    expect(productionOrderDeviationsService.findAll).toHaveBeenCalledWith(
      { production_order_id: 2031 },
    );
  });

  it('passes search, filters and pagination through unchanged', async () => {
    const query = { search: 'aspirin 001', reporter_id: 7, page: 2, limit: 20 };
    const result = { data: [], total: 0, page: 2, limit: 20 };
    productionOrderDeviationsService.findAll.mockResolvedValue(result);
    await expect(controller.findAll(query)).resolves.toBe(result);
    expect(productionOrderDeviationsService.findAll).toHaveBeenCalledWith(query);
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
