import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ItemEquipmentService } from './item-equipment.service';

describe('ItemEquipmentService', () => {
  let service: ItemEquipmentService;
  let prismaService: {
    items: {
      findUnique: jest.Mock;
    };
    equipment: {
      findUnique: jest.Mock;
    };
    itemEquipment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemEquipmentService,
        {
          provide: PrismaService,
          useValue: {
            items: {
              findUnique: jest.fn(),
            },
            equipment: {
              findUnique: jest.fn(),
            },
            itemEquipment: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ItemEquipmentService>(ItemEquipmentService);
    prismaService = module.get(PrismaService);
  });

  it('creates an item equipment relation with authenticated user', async () => {
    const itemEquipment = {
      id: 1,
      item_code: 'TP00001',
      equipment_id: 2,
      created_by_id: 7,
    };
    prismaService.items.findUnique.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.equipment.findUnique.mockResolvedValue({ id: 2 });
    prismaService.itemEquipment.findUnique.mockResolvedValue(null);
    prismaService.itemEquipment.create.mockResolvedValue(itemEquipment);

    await expect(
      service.create(' TP00001 ', { equipment_id: '2' }, { id: '7' }),
    ).resolves.toBe(itemEquipment);

    expect(prismaService.itemEquipment.create).toHaveBeenCalledWith({
      data: {
        item_code: 'TP00001',
        equipment_id: 2,
        created_by_id: 7,
      },
      include: {
        equipment: {
          include: {
            parameters: {
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            },
          },
        },
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

  it('rejects duplicate item equipment relation', async () => {
    prismaService.items.findUnique.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.equipment.findUnique.mockResolvedValue({ id: 2 });
    prismaService.itemEquipment.findUnique.mockResolvedValue({
      id: 1,
      item_code: 'TP00001',
      equipment_id: 2,
    });

    await expect(
      service.create('TP00001', { equipment_id: 2 }, { id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when item is missing', async () => {
    prismaService.items.findUnique.mockResolvedValue(null);

    await expect(
      service.create('TP00001', { equipment_id: 2 }, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an item equipment relation', async () => {
    const itemEquipment = {
      id: 1,
      item_code: 'TP00001',
      equipment_id: 2,
    };
    prismaService.itemEquipment.findUnique.mockResolvedValue(itemEquipment);
    prismaService.itemEquipment.delete.mockResolvedValue(itemEquipment);

    await expect(service.delete(1)).resolves.toBe(itemEquipment);

    expect(prismaService.itemEquipment.delete).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        equipment: {
          include: {
            parameters: {
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            },
          },
        },
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
});
