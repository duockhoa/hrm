import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { EquipmentIncidentReportsController } from './equipment-incident-reports.controller';
import { EquipmentIncidentReportsService } from './equipment-incident-reports.service';
import { EQUIPMENT_PERMISSIONS } from './equipment.permissions';

describe('EquipmentIncidentReportsController permissions', () => {
  let controller: EquipmentIncidentReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentIncidentReportsController],
      providers: [{ provide: EquipmentIncidentReportsService, useValue: {} }],
    }).compile();

    controller = module.get<EquipmentIncidentReportsController>(
      EquipmentIncidentReportsController,
    );
  });

  it('declares a permission key for every incident-report route', () => {
    const prototype = EquipmentIncidentReportsController.prototype;
    const routeNames = Object.getOwnPropertyNames(prototype).filter(
      (name) =>
        name !== 'constructor' &&
        Reflect.hasMetadata(
          METHOD_METADATA,
          prototype[name as keyof EquipmentIncidentReportsController],
        ),
    );

    expect(routeNames).toHaveLength(4);

    routeNames.forEach((name) => {
      const handler =
        prototype[name as keyof EquipmentIncidentReportsController];
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      const expectedPermission =
        name === 'findAll'
          ? EQUIPMENT_PERMISSIONS.LIST
          : requestMethod === RequestMethod.GET
            ? EQUIPMENT_PERMISSIONS.READ
            : requestMethod === RequestMethod.POST
              ? EQUIPMENT_PERMISSIONS.CREATE
              : EQUIPMENT_PERMISSIONS.UPDATE;

      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        expectedPermission,
      ]);
    });
  });
});
