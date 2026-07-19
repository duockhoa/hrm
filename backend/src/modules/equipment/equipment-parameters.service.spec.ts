import { ConflictException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { EquipmentParametersService } from './equipment-parameters.service';

describe('EquipmentParametersService', () => {
  let service: EquipmentParametersService;
  let prismaService: {
    equipment: {
      findUnique: jest.Mock;
    };
    equipmentParameters: {
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
        EquipmentParametersService,
        {
          provide: PrismaService,
          useValue: {
            equipment: {
              findUnique: jest.fn(),
            },
            equipmentParameters: {
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

    service = module.get<EquipmentParametersService>(
      EquipmentParametersService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates an equipment parameter with normalized data', async () => {
    const parameter = {
      id: 1,
      equipment_id: 10,
      name: 'Sai so cho phep',
      data_type: 'number',
      unit: 'g',
      is_required: true,
      created_by_id: 7,
    };
    prismaService.equipment.findUnique.mockResolvedValue({ id: 10 });
    prismaService.equipmentParameters.findUnique.mockResolvedValue(null);
    prismaService.equipmentParameters.create.mockResolvedValue(parameter);

    await expect(
      service.create(
        10,
        {
          name: ' Sai so cho phep ',
          data_type: 'NUMBER',
          unit: ' g ',
          is_required: 'true',
        },
        { id: '7' },
      ),
    ).resolves.toBe(parameter);

    expect(prismaService.equipmentParameters.create).toHaveBeenCalledWith({
      data: {
        equipment_id: 10,
        name: 'Sai so cho phep',
        data_type: 'number',
        unit: 'g',
        is_required: true,
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

  it('rejects duplicate parameter names for the same equipment', async () => {
    prismaService.equipment.findUnique.mockResolvedValue({ id: 10 });
    prismaService.equipmentParameters.findUnique.mockResolvedValue({
      id: 1,
      equipment_id: 10,
      name: 'Toc do',
    });

    await expect(
      service.create(10, { name: 'Toc do', data_type: 'number' }, { id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only provided fields', async () => {
    const parameter = {
      id: 1,
      equipment_id: 10,
      name: 'Toc do',
      data_type: 'number',
      unit: 'rpm',
      is_required: true,
    };
    prismaService.equipmentParameters.findUnique.mockResolvedValue(parameter);
    prismaService.equipmentParameters.update.mockResolvedValue({
      ...parameter,
      unit: null,
      is_required: false,
    });

    await service.update(1, { unit: '', is_required: false });

    expect(prismaService.equipmentParameters.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        unit: null,
        is_required: false,
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

  it('rejects unsupported data type', async () => {
    prismaService.equipment.findUnique.mockResolvedValue({ id: 10 });

    await expect(
      service.create(10, { name: 'Gia tri', data_type: 'json' }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
