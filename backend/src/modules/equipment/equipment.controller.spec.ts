import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { EquipmentMonitoringRecordsService } from './equipment-monitoring-records.service';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentController } from './equipment.controller';
import { EQUIPMENT_PERMISSIONS } from './equipment.permissions';
import { EquipmentService } from './equipment.service';

describe('EquipmentController permissions', () => {
  let controller: EquipmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [
        { provide: EquipmentService, useValue: {} },
        { provide: EquipmentParametersService, useValue: {} },
        { provide: EquipmentMonitoringRecordsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<EquipmentController>(EquipmentController);
  });

  it('declares permission keys for every equipment route', () => {
    const prototype = EquipmentController.prototype;
    const routeNames = Object.getOwnPropertyNames(prototype).filter(
      (name) =>
        name !== 'constructor' &&
        Reflect.hasMetadata(
          METHOD_METADATA,
          prototype[name as keyof EquipmentController],
        ),
    );

    expect(routeNames.length).toBe(18);

    routeNames.forEach((name) => {
      const handler = prototype[name as keyof EquipmentController];
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      const expectedPermission =
        name === 'findAll'
          ? EQUIPMENT_PERMISSIONS.LIST
          : requestMethod === RequestMethod.GET
            ? EQUIPMENT_PERMISSIONS.READ
            : requestMethod === RequestMethod.POST
              ? EQUIPMENT_PERMISSIONS.CREATE
              : requestMethod === RequestMethod.PATCH ||
                  requestMethod === RequestMethod.PUT
                ? EQUIPMENT_PERMISSIONS.UPDATE
                : EQUIPMENT_PERMISSIONS.DELETE;

      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        expectedPermission,
      ]);
    });
  });
});
