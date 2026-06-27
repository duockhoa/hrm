import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopsService } from './production-workshops.service';

describe('ProductionWorkshopsService', () => {
  let service: ProductionWorkshopsService;
  let prismaService: {
    productionWorkshops: {
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
        ProductionWorkshopsService,
        {
          provide: PrismaService,
          useValue: {
            productionWorkshops: {
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

    service = module.get<ProductionWorkshopsService>(
      ProductionWorkshopsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a production workshop with normalized data', async () => {
    const productionWorkshop = {
      id: 1,
      code: 'X001',
      name: 'Xuong san xuat 1',
      description: null,
      address: 'Khu A',
    };
    prismaService.productionWorkshops.findUnique.mockResolvedValue(null);
    prismaService.productionWorkshops.create.mockResolvedValue(
      productionWorkshop,
    );

    await expect(
      service.create({
        code: ' X001 ',
        name: ' Xuong san xuat 1 ',
        description: '',
        address: ' Khu A ',
      }),
    ).resolves.toBe(productionWorkshop);

    expect(prismaService.productionWorkshops.create).toHaveBeenCalledWith({
      data: {
        code: 'X001',
        name: 'Xuong san xuat 1',
        description: null,
        address: 'Khu A',
      },
    });
    expect(prismaService.productionWorkshops.findUnique).toHaveBeenCalledWith({
      where: { code: 'X001' },
      withDeleted: true,
    });
  });

  it('updates only provided fields', async () => {
    const productionWorkshop = {
      id: 1,
      code: 'X001',
      name: 'Xuong san xuat 1',
    };
    prismaService.productionWorkshops.findUnique.mockResolvedValue(
      productionWorkshop,
    );
    prismaService.productionWorkshops.update.mockResolvedValue({
      ...productionWorkshop,
      address: 'Khu B',
    });

    await service.update(1, { address: ' Khu B ' });

    expect(prismaService.productionWorkshops.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        address: 'Khu B',
      },
    });
  });
});
