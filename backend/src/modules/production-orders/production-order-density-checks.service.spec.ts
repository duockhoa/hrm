import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';

describe('ProductionOrderDensityChecksService', () => {
  let service: ProductionOrderDensityChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderDensityChecks: {
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
      productionOrderDensityChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderDensityChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderDensityChecksService>(
      ProductionOrderDensityChecksService,
    );
  });

  it('gets density checks for a production order', async () => {
    const densityChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDensityChecks.findMany.mockResolvedValue(
      densityChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      densityChecks,
    );
    expect(
      prismaService.productionOrderDensityChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a density check by id', async () => {
    const densityCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderDensityChecks.findUnique.mockResolvedValue(
      densityCheck,
    );

    await expect(service.findById(1)).resolves.toBe(densityCheck);
    expect(
      prismaService.productionOrderDensityChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the density check does not exist', async () => {
    prismaService.productionOrderDensityChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a density check and calculates density', async () => {
    const createdDensityCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDensityChecks.create.mockResolvedValue(
      createdDensityCheck,
    );

    const result = await service.create(
      2031,
      {
        empty_pycnometer_mass_g: '25,0000',
        solution_pycnometer_mass_g: '75.0000',
        water_pycnometer_mass_g: '75.5000',
      },
      { id: 7 },
    );

    expect(result).toBe(createdDensityCheck);
    const createArg =
      prismaService.productionOrderDensityChecks.create.mock.calls[0][0];
    expect(createArg.data).toEqual(
      expect.objectContaining({
        production_order_id: 2031,
        created_by_id: 7,
      }),
    );
    expect(createArg.data.empty_pycnometer_mass_g.toString()).toBe('25');
    expect(createArg.data.solution_pycnometer_mass_g.toString()).toBe('75');
    expect(createArg.data.water_pycnometer_mass_g.toString()).toBe('75.5');
    expect(createArg.data.density.toString()).toBe('0.990099');
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when water mass is not greater than empty mass', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          empty_pycnometer_mass_g: 25,
          solution_pycnometer_mass_g: 75,
          water_pycnometer_mass_g: 25,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        empty_pycnometer_mass_g: 25,
        solution_pycnometer_mass_g: 75,
        water_pycnometer_mass_g: 75.5,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
