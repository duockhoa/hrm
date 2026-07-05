import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let prismaService: {
    roles: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    permissions: {
      findMany: jest.Mock;
    };
    rolePermissions: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      roles: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permissions: {
        findMany: jest.fn(),
      },
      rolePermissions: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a role with normalized data', async () => {
    const role = { id: 1, name: 'admin', description: 'Administrator' };
    prismaService.roles.findUnique.mockResolvedValue(null);
    prismaService.roles.create.mockResolvedValue(role);

    await expect(
      service.create({
        roleName: ' admin ',
        description: ' Administrator ',
      }),
    ).resolves.toBe(role);

    expect(prismaService.roles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'admin',
          description: 'Administrator',
        },
        include: expect.any(Object),
      }),
    );
  });

  it('rejects duplicate role names on create', async () => {
    prismaService.roles.findUnique.mockResolvedValue({
      id: 1,
      name: 'admin',
    });

    await expect(service.create({ name: 'admin' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prismaService.roles.create).not.toHaveBeenCalled();
  });

  it('adds only missing permissions to a role', async () => {
    const role = { id: 1, name: 'qa' };
    prismaService.roles.findUnique.mockResolvedValue(role);
    prismaService.permissions.findMany.mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);
    prismaService.rolePermissions.findMany.mockResolvedValue([
      { permission_id: 1 },
    ]);
    prismaService.rolePermissions.createMany.mockResolvedValue({ count: 1 });

    await expect(service.addPermissionsToRole(1, [1, 2])).resolves.toBe(role);

    expect(prismaService.rolePermissions.createMany).toHaveBeenCalledWith({
      data: [{ role_id: 1, permission_id: 2 }],
    });
  });

  it('syncs an empty permission list by removing all role permissions', async () => {
    const role = { id: 1, name: 'qa' };
    prismaService.roles.findUnique.mockResolvedValue(role);

    await expect(service.syncPermissions(1, [])).resolves.toBe(role);

    expect(prismaService.rolePermissions.deleteMany).toHaveBeenCalledWith({
      where: { role_id: 1 },
    });
    expect(prismaService.rolePermissions.createMany).not.toHaveBeenCalled();
  });
});
