import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let prismaService: {
    items: {
      findMany: jest.Mock;
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
});
