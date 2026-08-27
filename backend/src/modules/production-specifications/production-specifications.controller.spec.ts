import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { PRODUCTION_SPECIFICATION_PERMISSIONS } from './production-specifications.permissions';
import { ProductionSpecificationsController } from './production-specifications.controller';
import { ProductionSpecificationsService } from './production-specifications.service';

describe('ProductionSpecificationsController', () => {
  let controller: ProductionSpecificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionSpecificationsController],
      providers: [
        {
          provide: ProductionSpecificationsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ProductionSpecificationsController>(
      ProductionSpecificationsController,
    );
  });

  it('declares permission keys for production-specification routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      PRODUCTION_SPECIFICATION_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findByItemCode)).toEqual([
      PRODUCTION_SPECIFICATION_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      PRODUCTION_SPECIFICATION_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      PRODUCTION_SPECIFICATION_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      PRODUCTION_SPECIFICATION_PERMISSIONS.DELETE,
    ]);
  });
});
