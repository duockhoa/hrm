import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';

describe('ProductionOrderFriabilityChecksService', () => {
  let service: ProductionOrderFriabilityChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderFriabilityChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderFriabilityChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderFriabilityChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderFriabilityChecksService>(
      ProductionOrderFriabilityChecksService,
    );
  });

  it('gets friability checks for a production order', async () => {
    const friabilityChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFriabilityChecks.findMany.mockResolvedValue(
      friabilityChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      friabilityChecks,
    );
    expect(
      prismaService.productionOrderFriabilityChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a friability check by id', async () => {
    const friabilityCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderFriabilityChecks.findUnique.mockResolvedValue(
      friabilityCheck,
    );

    await expect(service.findById(1)).resolves.toBe(friabilityCheck);
    expect(
      prismaService.productionOrderFriabilityChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the friability check does not exist', async () => {
    prismaService.productionOrderFriabilityChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a friability check and calculates friability percent', async () => {
    const createdFriabilityCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFriabilityChecks.create.mockResolvedValue(
      createdFriabilityCheck,
    );

    const result = await service.create(
      2031,
      {
        total_weight_before_check: '1000,000',
        total_weight_after_check: '990.000',
      },
      { id: 7 },
    );

    expect(result).toBe(createdFriabilityCheck);
    const createArg =
      prismaService.productionOrderFriabilityChecks.create.mock.calls[0][0];
    expect(createArg.data).toEqual(
      expect.objectContaining({
        production_order_id: 2031,
        weight_unit: 'mg',
        created_by_id: 7,
      }),
    );
    expect(createArg.data.total_weight_before_check.toString()).toBe('1000');
    expect(createArg.data.total_weight_after_check.toString()).toBe('990');
    expect(createArg.data.friability_percent.toString()).toBe('1');
  });

  it('throws BadRequestException when after weight is greater than before weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          total_weight_before_check: 1000,
          total_weight_after_check: 1000.001,
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
        total_weight_before_check: 1000,
        total_weight_after_check: 990,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
