import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';

describe('ProductionOrderPostHomogenizationGranuleChecksService', () => {
  let service: ProductionOrderPostHomogenizationGranuleChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderPostHomogenizationGranuleChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderPostHomogenizationGranuleChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderPostHomogenizationGranuleChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderPostHomogenizationGranuleChecksService>(
      ProductionOrderPostHomogenizationGranuleChecksService,
    );
  });

  it('gets post-homogenization granule checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderPostHomogenizationGranuleChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderPostHomogenizationGranuleChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a post-homogenization granule check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
    expect(
      prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the post-homogenization granule check does not exist', async () => {
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a post-homogenization granule check and calculates Carr index', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderPostHomogenizationGranuleChecks.create.mockResolvedValue(
      createdCheck,
    );

    const result = await service.create(
      2031,
      {
        bulk_density: '0,520000',
        tapped_density: '0.680000',
      },
      { id: 7 },
      {
        imagePath:
          '/production-orders/post-homogenization-granule-checks/images/test.jpg',
      },
    );

    expect(result).toBe(createdCheck);
    const createArg =
      prismaService.productionOrderPostHomogenizationGranuleChecks.create.mock
        .calls[0][0];
    expect(createArg.data).toEqual(
      expect.objectContaining({
        production_order_id: 2031,
        density_unit: 'g/ml',
        image_path:
          '/production-orders/post-homogenization-granule-checks/images/test.jpg',
        created_by_id: 7,
      }),
    );
    expect(createArg.data.bulk_density.toString()).toBe('0.52');
    expect(createArg.data.tapped_density.toString()).toBe('0.68');
    expect(createArg.data.carr_index.toString()).toBe('23.5294');
  });

  it('throws BadRequestException when tapped density is less than bulk density', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          bulk_density: 0.68,
          tapped_density: 0.52,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        bulk_density: 0.52,
        tapped_density: 0.68,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
