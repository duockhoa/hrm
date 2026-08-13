import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
      update: jest.Mock;
      delete: jest.Mock;
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
        update: jest.fn(),
        delete: jest.fn(),
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
        moisture_percent: '4,25',
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
    expect(createArg.data.moisture_percent.toString()).toBe('4.25');
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

  it('updates a post-homogenization granule check and recalculates Carr index', async () => {
    const updatedCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        bulk_density: new Prisma.Decimal('0.52'),
        tapped_density: new Prisma.Decimal('0.68'),
        image_path:
          '/production-orders/post-homogenization-granule-checks/images/old.jpg',
      },
    );
    prismaService.productionOrderPostHomogenizationGranuleChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(
        1,
        {
          tapped_density: '0.700000',
        },
        {
          imagePath:
            '/production-orders/post-homogenization-granule-checks/images/new.jpg',
        },
      ),
    ).resolves.toBe(updatedCheck);

    const updateArg =
      prismaService.productionOrderPostHomogenizationGranuleChecks.update.mock
        .calls[0][0];
    expect(updateArg.where).toEqual({ id: 1 });
    expect(updateArg.data.bulk_density).toBeUndefined();
    expect(updateArg.data.tapped_density.toString()).toBe('0.7');
    expect(updateArg.data.carr_index.toString()).toBe('25.7143');
    expect(updateArg.data.image_path).toBe(
      '/production-orders/post-homogenization-granule-checks/images/new.jpg',
    );
  });

  it('rejects a post-homogenization granule update without any supported fields', async () => {
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        bulk_density: new Prisma.Decimal('0.52'),
        tapped_density: new Prisma.Decimal('0.68'),
        image_path: null,
      },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('updates the moisture percentage without recalculating Carr index', async () => {
    const updatedCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        bulk_density: new Prisma.Decimal('0.52'),
        tapped_density: new Prisma.Decimal('0.68'),
        moisture_percent: null,
        image_path: null,
      },
    );
    prismaService.productionOrderPostHomogenizationGranuleChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { moisture_percent: '4,25' })).resolves.toBe(
      updatedCheck,
    );

    const updateArg =
      prismaService.productionOrderPostHomogenizationGranuleChecks.update.mock
        .calls[0][0];
    expect(updateArg.data.moisture_percent.toString()).toBe('4.25');
    expect(updateArg.data.carr_index).toBeUndefined();
  });

  it('rejects a moisture percentage above 100', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          bulk_density: 0.52,
          tapped_density: 0.68,
          moisture_percent: 100.01,
        },
        { id: 7 },
      ),
    ).rejects.toThrow('moisture_percent must not exceed 100');
  });

  it('throws NotFoundException when updating a missing post-homogenization granule check', async () => {
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, {
        tapped_density: 0.68,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an existing post-homogenization granule check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        bulk_density: new Prisma.Decimal('0.52'),
        tapped_density: new Prisma.Decimal('0.68'),
        image_path: null,
      },
    );
    prismaService.productionOrderPostHomogenizationGranuleChecks.delete.mockResolvedValue(
      deletedCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedCheck);
    expect(
      prismaService.productionOrderPostHomogenizationGranuleChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
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
