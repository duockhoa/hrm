import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { SecondaryPackagingStageRequirementsController } from './secondary-packaging-stage-requirements.controller';
import { SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS } from './secondary-packaging-stage-requirements.permissions';
import { SecondaryPackagingStageRequirementsService } from './secondary-packaging-stage-requirements.service';

describe('SecondaryPackagingStageRequirementsController', () => {
  let controller: SecondaryPackagingStageRequirementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecondaryPackagingStageRequirementsController],
      providers: [
        {
          provide: SecondaryPackagingStageRequirementsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<SecondaryPackagingStageRequirementsController>(
      SecondaryPackagingStageRequirementsController,
    );
  });

  it('declares permission keys for stage-requirement routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      SECONDARY_PACKAGING_STAGE_REQUIREMENT_PERMISSIONS.DELETE,
    ]);
  });
});
