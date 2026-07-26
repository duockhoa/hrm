import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: {
    users: {
      findUnique: jest.Mock;
    };
    roles: {
      findMany: jest.Mock;
    };
    applications: {
      findMany: jest.Mock;
    };
    userRoles: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    userApplications: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      users: {
        findUnique: jest.fn(),
      },
      roles: {
        findMany: jest.fn(),
      },
      applications: {
        findMany: jest.fn(),
      },
      userRoles: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      userApplications: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds only missing roles to a user', async () => {
    const userRoles = [{ id: 1, user_id: 1, role_id: 1 }];
    prismaService.users.findUnique.mockResolvedValue({ id: 1 });
    prismaService.roles.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prismaService.userRoles.findMany
      .mockResolvedValueOnce([{ role_id: 1 }])
      .mockResolvedValueOnce(userRoles);
    prismaService.userRoles.createMany.mockResolvedValue({ count: 1 });

    await expect(service.addRolesToUser(1, [1, 2])).resolves.toBe(userRoles);

    expect(prismaService.userRoles.createMany).toHaveBeenCalledWith({
      data: [{ user_id: 1, role_id: 2 }],
    });
  });

  it('syncs an empty role list by removing all user roles', async () => {
    prismaService.users.findUnique.mockResolvedValue({ id: 1 });
    prismaService.userRoles.findMany.mockResolvedValue([]);

    await expect(service.syncRoles(1, [])).resolves.toEqual([]);

    expect(prismaService.userRoles.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
    });
    expect(prismaService.userRoles.createMany).not.toHaveBeenCalled();
  });

  it('gets active applications for a user', async () => {
    const applications = [{ id: 1, key: 'hrm', name: 'HRM' }];
    prismaService.users.findUnique.mockResolvedValue({ id: 1 });
    prismaService.applications.findMany.mockResolvedValue(applications);

    await expect(service.findApplicationsByUserId(1)).resolves.toBe(
      applications,
    );
    expect(prismaService.applications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          is_active: true,
          userApplications: {
            some: {
              user_id: 1,
            },
          },
        },
      }),
    );
  });

  it('syncs applications for a user', async () => {
    const applications = [{ id: 1, key: 'hrm', name: 'HRM' }];
    prismaService.users.findUnique.mockResolvedValue({ id: 1 });
    prismaService.applications.findMany
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce(applications);

    await expect(service.syncApplications(1, [1, 2])).resolves.toBe(
      applications,
    );
    expect(prismaService.userApplications.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
    });
    expect(prismaService.userApplications.createMany).toHaveBeenCalledWith({
      data: [
        { user_id: 1, application_id: 1 },
        { user_id: 1, application_id: 2 },
      ],
    });
  });

  it('syncs an empty application list by removing all user applications', async () => {
    prismaService.users.findUnique.mockResolvedValue({ id: 1 });
    prismaService.applications.findMany.mockResolvedValue([]);

    await expect(service.syncApplications(1, [])).resolves.toEqual([]);

    expect(prismaService.userApplications.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
    });
    expect(prismaService.userApplications.createMany).not.toHaveBeenCalled();
  });
});
