import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from 'src/cloudinary.service';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { UsersController } from './users.controller';
import { USER_PERMISSIONS } from './users.permissions';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { findPermissionKeysByUserId: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findPermissionKeysByUserId: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: CloudinaryService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns permission keys for the authenticated user', async () => {
    const response = { permissionKeys: ['users.read'] };
    usersService.findPermissionKeysByUserId.mockResolvedValue(response);

    await expect(controller.findMyPermissionKeys({ user: { id: 1 } })).resolves.toBe(
      response,
    );
    expect(usersService.findPermissionKeysByUserId).toHaveBeenCalledWith(1);
  });

  it('returns permission keys for a user ID', async () => {
    const response = { permissionKeys: ['users.read'] };
    usersService.findPermissionKeysByUserId.mockResolvedValue(response);

    await expect(controller.findPermissionKeysByUserId(2)).resolves.toBe(
      response,
    );
    expect(usersService.findPermissionKeysByUserId).toHaveBeenCalledWith(2);
  });

  it('declares permission keys for administrative user routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
      USER_PERMISSIONS.LIST,
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.syncRoles),
    ).toEqual([USER_PERMISSIONS.ROLES_ASSIGN]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.deleteUser),
    ).toEqual([USER_PERMISSIONS.DELETE]);
  });
});
