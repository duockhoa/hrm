import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { ProductionWorkshopCleaningChecklistsService } from './production-workshop-cleaning-checklists.service';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';
import { PRODUCTION_WORKSHOP_PERMISSIONS } from './production-workshops.permissions';
import { ProductionWorkshopsController } from './production-workshops.controller';
import { ProductionWorkshopsService } from './production-workshops.service';

describe('ProductionWorkshopsController', () => {
  let controller: ProductionWorkshopsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionWorkshopsController],
      providers: [
        { provide: ProductionWorkshopsService, useValue: {} },
        {
          provide: ProductionWorkshopPressureDifferentialsService,
          useValue: {},
        },
        {
          provide: ProductionWorkshopCleaningChecklistsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ProductionWorkshopsController>(
      ProductionWorkshopsController,
    );
  });

  it('declares permission keys for production-workshop routes', () => {
    const metadata = (method: keyof ProductionWorkshopsController) =>
      Reflect.getMetadata(PERMISSIONS_KEY, controller[method]);

    expect(metadata('findAll')).toEqual([PRODUCTION_WORKSHOP_PERMISSIONS.LIST]);
    expect(metadata('findById')).toEqual([PRODUCTION_WORKSHOP_PERMISSIONS.READ]);
    expect(metadata('findPressureDifferentialById')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.READ,
    ]);
    expect(metadata('findPressureDifferentials')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.READ,
    ]);
    expect(metadata('findCleaningChecklistById')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.CLEANING_CHECKLIST_READ,
    ]);
    expect(metadata('findCleaningChecklists')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.CLEANING_CHECKLIST_READ,
    ]);
    expect(metadata('create')).toEqual([PRODUCTION_WORKSHOP_PERMISSIONS.CREATE]);
    expect(metadata('createPressureDifferential')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_CREATE,
    ]);
    expect(metadata('createCleaningChecklist')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.CLEANING_CHECKLIST_CREATE,
    ]);
    expect(metadata('update')).toEqual([PRODUCTION_WORKSHOP_PERMISSIONS.UPDATE]);
    expect(metadata('updatePressureDifferential')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_UPDATE,
    ]);
    expect(metadata('updateCleaningChecklist')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.CLEANING_CHECKLIST_UPDATE,
    ]);
    expect(metadata('delete')).toEqual([PRODUCTION_WORKSHOP_PERMISSIONS.DELETE]);
    expect(metadata('deletePressureDifferential')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.PRESSURE_DIFFERENTIAL_DELETE,
    ]);
    expect(metadata('deleteCleaningChecklist')).toEqual([
      PRODUCTION_WORKSHOP_PERMISSIONS.CLEANING_CHECKLIST_DELETE,
    ]);
  });
});
