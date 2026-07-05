import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let permissionsService: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    permissionsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useValue: permissionsService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findAll to the service', () => {
    const permissions = [{ id: 1, name: 'users.read' }];
    permissionsService.findAll.mockReturnValue(permissions);

    expect(controller.findAll()).toBe(permissions);
    expect(permissionsService.findAll).toHaveBeenCalled();
  });

  it('delegates create to the service', () => {
    const dto = { name: 'users.read', description: 'Read users' };
    const permission = { id: 1, ...dto };
    permissionsService.create.mockReturnValue(permission);

    expect(controller.create(dto)).toBe(permission);
    expect(permissionsService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates update to the service', () => {
    const dto = { description: 'Read all users' };
    const permission = { id: 1, name: 'users.read', ...dto };
    permissionsService.update.mockReturnValue(permission);

    expect(controller.update(1, dto)).toBe(permission);
    expect(permissionsService.update).toHaveBeenCalledWith(1, dto);
  });

  it('delegates delete to the service', () => {
    const permission = { id: 1, name: 'users.read' };
    permissionsService.delete.mockReturnValue(permission);

    expect(controller.delete(1)).toBe(permission);
    expect(permissionsService.delete).toHaveBeenCalledWith(1);
  });
});
