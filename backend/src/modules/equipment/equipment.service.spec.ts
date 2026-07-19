import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { EquipmentService } from './equipment.service';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let prismaService: {
    equipment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        {
          provide: PrismaService,
          useValue: {
            equipment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
    prismaService = module.get(PrismaService);
  });

  it('creates equipment with normalized data and authenticated user', async () => {
    const equipment = {
      id: 1,
      code: 'TB-001',
      name: 'Can phan tich',
      created_by_id: 7,
    };
    prismaService.equipment.findUnique.mockResolvedValue(null);
    prismaService.equipment.create.mockResolvedValue(equipment);

    await expect(
      service.create(
        {
          code: ' TB-001 ',
          name: ' Can phan tich ',
        },
        { id: '7' },
      ),
    ).resolves.toBe(equipment);

    expect(prismaService.equipment.create).toHaveBeenCalledWith({
      data: {
        code: 'TB-001',
        name: 'Can phan tich',
        created_by_id: 7,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
    });
  });

  it('rejects duplicate equipment code', async () => {
    prismaService.equipment.findUnique.mockResolvedValue({
      id: 1,
      code: 'TB-001',
    });

    await expect(
      service.create({ code: 'TB-001', name: 'Can phan tich' }, { id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only provided fields', async () => {
    const equipment = {
      id: 1,
      code: 'TB-001',
      name: 'Can phan tich',
    };
    prismaService.equipment.findUnique.mockResolvedValue(equipment);
    prismaService.equipment.update.mockResolvedValue({
      ...equipment,
      name: 'May tron',
    });

    await service.update(1, { name: ' May tron ' });

    expect(prismaService.equipment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'May tron',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            department: true,
            position: true,
          },
        },
      },
    });
  });

  it('requires an authenticated user when creating equipment', async () => {
    await expect(
      service.create({ code: 'TB-001', name: 'Can phan tich' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
