import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let prismaService: {
    applications: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      applications: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  it('gets applications ordered for display', async () => {
    const applications = [{ id: 1, key: 'hrm', name: 'HRM' }];
    prismaService.applications.findMany.mockResolvedValue(applications);

    await expect(service.findAll()).resolves.toBe(applications);
    expect(prismaService.applications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ default_order: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('creates an application with normalized input', async () => {
    const application = { id: 1, key: 'hrm', name: 'HRM' };
    prismaService.applications.findUnique.mockResolvedValue(null);
    prismaService.applications.create.mockResolvedValue(application);

    await expect(
      service.create({
        key: ' hrm ',
        name: ' HRM ',
        description: ' ',
        route: ' /home ',
        icon: ' home ',
        default_order: 1,
      }),
    ).resolves.toBe(application);
    expect(prismaService.applications.create).toHaveBeenCalledWith({
      data: {
        key: 'hrm',
        name: 'HRM',
        description: null,
        route: '/home',
        icon: 'home',
        default_order: 1,
        is_active: true,
      },
    });
  });

  it('throws ConflictException when key already exists', async () => {
    prismaService.applications.findUnique.mockResolvedValue({
      id: 1,
      key: 'hrm',
    });

    await expect(
      service.create({
        key: 'hrm',
        name: 'HRM',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates an application', async () => {
    const application = { id: 1, key: 'production', name: 'Production' };
    prismaService.applications.findUnique
      .mockResolvedValueOnce({ id: 1, key: 'hrm' })
      .mockResolvedValueOnce(null);
    prismaService.applications.update.mockResolvedValue(application);

    await expect(
      service.update(1, {
        key: 'production',
        name: 'Production',
        is_active: false,
      }),
    ).resolves.toBe(application);
    expect(prismaService.applications.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        key: 'production',
        name: 'Production',
        is_active: false,
      },
    });
  });

  it('throws BadRequestException when update has no fields', async () => {
    prismaService.applications.findUnique.mockResolvedValue({ id: 1 });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes an application', async () => {
    const application = { id: 1, key: 'hrm' };
    prismaService.applications.findUnique.mockResolvedValue(application);
    prismaService.applications.delete.mockResolvedValue(application);

    await expect(service.delete(1)).resolves.toBe(application);
    expect(prismaService.applications.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('throws NotFoundException when application does not exist', async () => {
    prismaService.applications.findUnique.mockResolvedValue(null);

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
