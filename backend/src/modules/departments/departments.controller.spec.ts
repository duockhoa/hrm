import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { DepartmentsController } from './departments.controller';
import { DEPARTMENT_PERMISSIONS } from './departments.permissions';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
  let controller: DepartmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [
        {
          provide: DepartmentsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<DepartmentsController>(DepartmentsController);
  });

  it('declares permission keys for department routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      DEPARTMENT_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findByName)).toEqual([
      DEPARTMENT_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
      DEPARTMENT_PERMISSIONS.CREATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
      DEPARTMENT_PERMISSIONS.UPDATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.delete)).toEqual([
      DEPARTMENT_PERMISSIONS.DELETE,
    ]);
  });
});
