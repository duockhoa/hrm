import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { FILTER_CATALOG_PERMISSIONS } from './filter-catalogs.permissions';
import { FilterCatalogsController } from './filter-catalogs.controller';
import { FilterCatalogsService } from './filter-catalogs.service';

describe('FilterCatalogsController', () => {
  let controller: FilterCatalogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilterCatalogsController],
      providers: [
        {
          provide: FilterCatalogsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<FilterCatalogsController>(FilterCatalogsController);
  });

  it('declares permission keys for filter-catalog routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      FILTER_CATALOG_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      FILTER_CATALOG_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      FILTER_CATALOG_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      FILTER_CATALOG_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      FILTER_CATALOG_PERMISSIONS.DELETE,
    ]);
  });
});
