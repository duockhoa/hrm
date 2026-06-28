import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';

describe('ProductionWorkshopPressureDifferentialsService', () => {
  let service: ProductionWorkshopPressureDifferentialsService;
  let prismaService: {
    productionWorkshops: {
      findUnique: jest.Mock;
    };
    productionWorkshopPressureDifferentials: {
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
        ProductionWorkshopPressureDifferentialsService,
        {
          provide: PrismaService,
          useValue: {
            productionWorkshops: {
              findUnique: jest.fn(),
            },
            productionWorkshopPressureDifferentials: {
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

    service = module.get<ProductionWorkshopPressureDifferentialsService>(
      ProductionWorkshopPressureDifferentialsService,
    );
    prismaService = module.get(PrismaService);
  });

  it('creates a pressure differential with normalized data', async () => {
    const pressureDifferential = {
      id: 1,
      workshop_id: 1,
      gauge_name: 'Dong ho khu pha che',
      differential_pressure: 15,
      unit: 'Pa',
      conclusion: 'dat',
    };
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 1 });
    prismaService.productionWorkshopPressureDifferentials.create.mockResolvedValue(
      pressureDifferential,
    );

    await expect(
      service.create(
        1,
        {
          gauge_name: ' Dong ho khu pha che ',
          differential_pressure: '15',
          conclusion: ' dat ',
          checked_at: '2026-06-27T08:00:00.000Z',
        },
        { id: '2' },
      ),
    ).resolves.toBe(pressureDifferential);

    expect(
      prismaService.productionWorkshopPressureDifferentials.create,
    ).toHaveBeenCalledWith({
      data: {
        workshop_id: 1,
        gauge_name: 'Dong ho khu pha che',
        differential_pressure: 15,
        unit: 'Pa',
        conclusion: 'dat',
        created_by_id: 2,
        checked_at: new Date('2026-06-27T08:00:00.000Z'),
      },
      include: expect.any(Object),
    });
  });

  it('rejects non-integer pressure values', async () => {
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.create(
        1,
        {
          gauge_name: 'Dong ho khu pha che',
          differential_pressure: '15.5',
          conclusion: 'dat',
        },
        { id: 2 },
      ),
    ).rejects.toThrow('differential_pressure must be an integer');
  });

  it('lists pressure differentials by workshop ordered newest first', async () => {
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 1 });
    prismaService.productionWorkshopPressureDifferentials.findMany.mockResolvedValue(
      [],
    );

    await service.findAllByProductionWorkshop(1);

    expect(
      prismaService.productionWorkshopPressureDifferentials.findMany,
    ).toHaveBeenCalledWith({
      where: {
        workshop_id: 1,
      },
      include: expect.any(Object),
      orderBy: [
        {
          checked_at: 'desc',
        },
        {
          created_at: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  });

  it('updates provided fields', async () => {
    const pressureDifferential = {
      id: 1,
      workshop_id: 1,
      gauge_name: 'Dong ho khu pha che',
      differential_pressure: 15,
      unit: 'Pa',
      conclusion: 'dat',
    };
    prismaService.productionWorkshopPressureDifferentials.findUnique.mockResolvedValue(
      pressureDifferential,
    );
    prismaService.productionWorkshopPressureDifferentials.update.mockResolvedValue(
      {
        ...pressureDifferential,
        differential_pressure: 16,
      },
    );

    await service.update(1, { differential_pressure: '16' });

    expect(
      prismaService.productionWorkshopPressureDifferentials.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        differential_pressure: 16,
      },
      include: expect.any(Object),
    });
  });
});
