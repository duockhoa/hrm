import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { RolesController } from './roles.controller';
import { ROLE_PERMISSIONS } from './roles.permissions';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declares permission keys for role management routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      ROLE_PERMISSIONS.LIST,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findById)).toEqual([
      ROLE_PERMISSIONS.READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.createRole)).toEqual(
      [ROLE_PERMISSIONS.CREATE],
    );
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.updateRole)).toEqual(
      [ROLE_PERMISSIONS.UPDATE],
    );
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.deleteRole)).toEqual(
      [ROLE_PERMISSIONS.DELETE],
    );

    [
      controller.addPermissionsToRole,
      controller.addPermissionToRole,
      controller.syncPermissions,
      controller.removePermissionFromRoleByCanonicalRoute,
      controller.removePermissionFromRole,
    ].forEach((handler) =>
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        ROLE_PERMISSIONS.PERMISSIONS_ASSIGN,
      ]),
    );
  });
});
