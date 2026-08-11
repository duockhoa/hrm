import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ProductLinesController } from './product-lines.controller';
import { PRODUCT_LINE_PERMISSIONS } from './product-lines.permissions';
import { ProductLinesService } from './product-lines.service';

describe('ProductLinesController', () => {
  let controller: ProductLinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductLinesController],
      providers: [
        {
          provide: ProductLinesService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ProductLinesController>(ProductLinesController);
  });

  it('declares permission keys for product-line routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      PRODUCT_LINE_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findByCode)).toEqual([
      PRODUCT_LINE_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      PRODUCT_LINE_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      PRODUCT_LINE_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      PRODUCT_LINE_PERMISSIONS.DELETE,
    ]);
  });
});
