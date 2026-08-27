import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { DosageFormsController } from './dosage-forms.controller';
import { DOSAGE_FORM_PERMISSIONS } from './dosage-forms.permissions';
import { DosageFormsService } from './dosage-forms.service';

describe('DosageFormsController', () => {
  let controller: DosageFormsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DosageFormsController],
      providers: [
        {
          provide: DosageFormsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DosageFormsController>(DosageFormsController);
  });

  it('declares permission keys for dosage-form routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      DOSAGE_FORM_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      DOSAGE_FORM_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      DOSAGE_FORM_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      DOSAGE_FORM_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      DOSAGE_FORM_PERMISSIONS.DELETE,
    ]);
  });
});
