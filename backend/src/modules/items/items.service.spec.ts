import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let prismaService: {
    items: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    registrationNumbers: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: PrismaService,
          useValue: {
            items: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            registrationNumbers: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns items with production specification product line', async () => {
    const items = [
      {
        item_code: 'TP00001',
        productionSpecification: {
          item_code: 'TP00001',
          product_line_id: 1,
          deleted_at: null,
          productLine: {
            id: 1,
            code: 'LINE_A',
            name: 'Line A',
          },
        },
      },
    ];
    prismaService.items.findMany.mockResolvedValue(items);

    await expect(service.findAll()).resolves.toEqual(items);
    expect(prismaService.items.findMany).toHaveBeenCalledWith({
      include: {
        registration: true,
        productionSpecification: {
          include: {
            productLine: true,
            updatedBy: {
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
        },
      },
    });
  });

  it('filters items by an alphabetical code prefix', async () => {
    prismaService.items.findMany.mockResolvedValue([]);

    await expect(service.findAll('btp')).resolves.toEqual([]);
    expect(prismaService.items.findMany).toHaveBeenCalledWith({
      where: {
        item_code: { startsWith: 'BTP' },
      },
      include: expect.any(Object),
    });
  });

  it('rejects an invalid item code prefix', async () => {
    await expect(service.findAll('BTP-')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaService.items.findMany).not.toHaveBeenCalled();
  });

  it('returns item detail with production specification product line', async () => {
    const item = {
      item_code: 'TP00001',
      productionSpecification: {
        item_code: 'TP00001',
        product_line_id: 1,
        deleted_at: null,
        productLine: {
          id: 1,
          code: 'LINE_A',
          name: 'Line A',
        },
      },
    };
    prismaService.items.findUnique.mockResolvedValue(item);

    await expect(service.findItemByCode('TP00001')).resolves.toBe(item);
    expect(prismaService.items.findUnique).toHaveBeenCalledWith({
      where: {
        item_code: 'TP00001',
      },
      include: {
        registration: true,
        productionSpecification: {
          include: {
            productLine: true,
            updatedBy: {
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
        },
      },
    });
  });

  it('hides soft-deleted production specification on item detail', async () => {
    prismaService.items.findUnique.mockResolvedValue({
      item_code: 'TP00001',
      productionSpecification: {
        item_code: 'TP00001',
        deleted_at: new Date('2026-06-14T00:00:00.000Z'),
        productLine: {
          id: 1,
          code: 'LINE_A',
          name: 'Line A',
        },
      },
    });

    await expect(service.findItemByCode('TP00001')).resolves.toEqual({
      item_code: 'TP00001',
      productionSpecification: null,
    });
  });

  it('hides soft-deleted production specification on item lists', async () => {
    prismaService.items.findMany.mockResolvedValue([
      {
        item_code: 'TP00001',
        productionSpecification: {
          item_code: 'TP00001',
          deleted_at: new Date('2026-06-14T00:00:00.000Z'),
          productLine: {
            id: 1,
            code: 'LINE_A',
            name: 'Line A',
          },
        },
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      {
        item_code: 'TP00001',
        productionSpecification: null,
      },
    ]);
  });

  it('updates item registration_id', async () => {
    const updatedItem = {
      item_code: 'TP00001',
      registration_id: 583,
      registration: {
        id: 583,
        registration_number: '723/26/CBMP-PT',
      },
    };
    prismaService.items.findUnique.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.registrationNumbers.findUnique.mockResolvedValue({ id: 583 });
    prismaService.items.update.mockResolvedValue(updatedItem);

    await expect(
      service.update('TP00001', { registration_id: '583' }),
    ).resolves.toBe(updatedItem);

    expect(prismaService.items.update).toHaveBeenCalledWith({
      where: {
        item_code: 'TP00001',
      },
      data: {
        registration_id: 583,
      },
      include: {
        registration: true,
        productionSpecification: {
          include: {
            productLine: true,
            updatedBy: {
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
        },
      },
    });
  });

  it('clears item registration_id', async () => {
    const updatedItem = {
      item_code: 'TP00001',
      registration_id: null,
    };
    prismaService.items.findUnique.mockResolvedValue({ item_code: 'TP00001' });
    prismaService.items.update.mockResolvedValue(updatedItem);

    await expect(
      service.update('TP00001', { registration_id: null }),
    ).resolves.toBe(updatedItem);

    expect(prismaService.registrationNumbers.findUnique).not.toHaveBeenCalled();
    expect(prismaService.items.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          registration_id: null,
        },
      }),
    );
  });

  it('rejects missing or invalid registration_id update', async () => {
    prismaService.items.findUnique.mockResolvedValue({ item_code: 'TP00001' });

    await expect(service.update('TP00001', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.update('TP00001', { registration_id: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when item or registration number is missing', async () => {
    prismaService.items.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update('TP00001', { registration_id: 583 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prismaService.items.findUnique.mockResolvedValueOnce({
      item_code: 'TP00001',
    });
    prismaService.registrationNumbers.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.update('TP00001', { registration_id: 583 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
