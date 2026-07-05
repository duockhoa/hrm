import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prismaService: {
    permissions: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      permissions: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('finds all permissions ordered by name', async () => {
    const permissions = [{ id: 1, name: 'users.read' }];
    prismaService.permissions.findMany.mockResolvedValue(permissions);

    await expect(service.findAll()).resolves.toBe(permissions);
    expect(prismaService.permissions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('creates a permission with normalized data', async () => {
    const permission = {
      id: 1,
      name: 'users.read',
      description: 'Read users',
    };
    prismaService.permissions.findUnique.mockResolvedValue(null);
    prismaService.permissions.create.mockResolvedValue(permission);

    await expect(
      service.create({
        name: ' users.read ',
        description: ' Read users ',
      }),
    ).resolves.toBe(permission);

    expect(prismaService.permissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'users.read',
          description: 'Read users',
        },
        include: expect.any(Object),
      }),
    );
  });

  it('rejects duplicate permission names on create', async () => {
    prismaService.permissions.findUnique.mockResolvedValue({
      id: 1,
      name: 'users.read',
    });

    await expect(
      service.create({ name: 'users.read' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaService.permissions.create).not.toHaveBeenCalled();
  });

  it('rejects update without data', async () => {
    prismaService.permissions.findUnique.mockResolvedValue({
      id: 1,
      name: 'users.read',
    });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaService.permissions.update).not.toHaveBeenCalled();
  });

  it('throws not found when deleting a missing permission', async () => {
    prismaService.permissions.findUnique.mockResolvedValue(null);

    await expect(service.delete(1)).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaService.permissions.delete).not.toHaveBeenCalled();
  });
});
