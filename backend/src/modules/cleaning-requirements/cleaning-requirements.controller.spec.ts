import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { CLEANING_REQUIREMENT_PERMISSIONS } from './cleaning-requirements.permissions';
import { CleaningRequirementsController } from './cleaning-requirements.controller';
import { CleaningRequirementsService } from './cleaning-requirements.service';

describe('CleaningRequirementsController', () => {
  let controller: CleaningRequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleaningRequirementsController],
      providers: [{ provide: CleaningRequirementsService, useValue: {} }],
    }).compile();

    controller = module.get<CleaningRequirementsController>(
      CleaningRequirementsController,
    );
  });

  it('declares permission keys for cleaning-requirement routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      CLEANING_REQUIREMENT_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      CLEANING_REQUIREMENT_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      CLEANING_REQUIREMENT_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      CLEANING_REQUIREMENT_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      CLEANING_REQUIREMENT_PERMISSIONS.DELETE,
    ]);
  });
});
