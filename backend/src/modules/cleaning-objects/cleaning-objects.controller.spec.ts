import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { CLEANING_OBJECT_PERMISSIONS } from './cleaning-objects.permissions';
import { CleaningObjectsController } from './cleaning-objects.controller';
import { CleaningObjectsService } from './cleaning-objects.service';

describe('CleaningObjectsController', () => {
  let controller: CleaningObjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleaningObjectsController],
      providers: [{ provide: CleaningObjectsService, useValue: {} }],
    }).compile();

    controller = module.get<CleaningObjectsController>(CleaningObjectsController);
  });

  it('declares permission keys for cleaning-object routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findByQrCode)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      CLEANING_OBJECT_PERMISSIONS.DELETE,
    ]);
  });
});
