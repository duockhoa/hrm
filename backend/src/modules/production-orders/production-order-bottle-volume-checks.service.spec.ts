import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderBottleVolumeChecksService } from './production-order-bottle-volume-checks.service';

describe('ProductionOrderBottleVolumeChecksService', () => {
  let service: ProductionOrderBottleVolumeChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderBottleVolumeChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };

  const validDto = {
    bottle_1_volume: 10.01,
    bottle_2_volume: '10,02',
    bottle_3_volume: '9.98',
    bottle_4_volume: 10,
    bottle_5_volume: 10.03,
    bottle_6_volume: 9.99,
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderBottleVolumeChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderBottleVolumeChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderBottleVolumeChecksService>(
      ProductionOrderBottleVolumeChecksService,
    );
  });

  it('gets bottle volume checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderBottleVolumeChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderBottleVolumeChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a bottle volume check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderBottleVolumeChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a bottle volume check does not exist', async () => {
    prismaService.productionOrderBottleVolumeChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a check with six normalized volumes and a fixed ml unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderBottleVolumeChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );

    expect(
      prismaService.productionOrderBottleVolumeChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          bottle_1_volume: new Prisma.Decimal('10.01'),
          bottle_2_volume: new Prisma.Decimal('10.02'),
          bottle_3_volume: new Prisma.Decimal('9.98'),
          bottle_4_volume: new Prisma.Decimal('10'),
          bottle_5_volume: new Prisma.Decimal('10.03'),
          bottle_6_volume: new Prisma.Decimal('9.99'),
          unit: 'ml',
          created_by_id: 7,
        },
      }),
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a check when only one bottle volume is provided', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderBottleVolumeChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          bottle_1_volume: 10.01,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderBottleVolumeChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          bottle_1_volume: new Prisma.Decimal('10.01'),
          bottle_2_volume: null,
          bottle_3_volume: null,
          bottle_4_volume: null,
          bottle_5_volume: null,
          bottle_6_volume: null,
          unit: 'ml',
          created_by_id: 7,
        },
      }),
    );
  });

  it('rejects a check without any bottle volume', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, {}, { id: 7 })).rejects.toThrow(
      'At least one bottle volume is required',
    );
    expect(
      prismaService.productionOrderBottleVolumeChecks.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects a volume with more than two decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          ...validDto,
          bottle_1_volume: '10.001',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a volume that is not greater than zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          ...validDto,
          bottle_1_volume: 0,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
