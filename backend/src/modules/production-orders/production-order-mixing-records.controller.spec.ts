import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ProductionOrderMixingRecordsController } from './production-order-mixing-records.controller';
import { PRODUCTION_ORDER_MIXING_RECORD_PERMISSIONS } from './production-order-mixing-records.permissions';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';
import { PRODUCTION_ORDER_PERMISSIONS } from './production-orders.permissions';

describe('ProductionOrderMixingRecordsController permissions', () => {
  let controller: ProductionOrderMixingRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrderMixingRecordsController],
      providers: [
        {
          provide: ProductionOrderMixingRecordsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ProductionOrderMixingRecordsController>(
      ProductionOrderMixingRecordsController,
    );
  });

  it('declares permission keys for every mixing-record route', () => {
    const prototype = ProductionOrderMixingRecordsController.prototype;
    const routeNames = Object.getOwnPropertyNames(prototype).filter(
      (name) =>
        name !== 'constructor' &&
        Reflect.hasMetadata(
          METHOD_METADATA,
          prototype[name as keyof ProductionOrderMixingRecordsController],
        ),
    );

    expect(routeNames.length).toBeGreaterThan(0);

    routeNames.forEach((name) => {
      const handler =
        prototype[name as keyof ProductionOrderMixingRecordsController];
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler);

      if (name === 'delete') {
        expect(permissions).toEqual([
          PRODUCTION_ORDER_MIXING_RECORD_PERMISSIONS.DELETE,
          PRODUCTION_ORDER_PERMISSIONS.DELETE,
        ]);
        return;
      }

      const expectedPermission =
        requestMethod === RequestMethod.GET
          ? PRODUCTION_ORDER_PERMISSIONS.READ
          : requestMethod === RequestMethod.POST
            ? PRODUCTION_ORDER_PERMISSIONS.CREATE
            : requestMethod === RequestMethod.PATCH ||
                requestMethod === RequestMethod.PUT
              ? PRODUCTION_ORDER_PERMISSIONS.UPDATE
              : PRODUCTION_ORDER_PERMISSIONS.DELETE;

      expect(permissions).toEqual([expectedPermission]);
    });
  });
});
