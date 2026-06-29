import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';

describe('ProductionOrderSprayDoseChecksService', () => {
  let service: ProductionOrderSprayDoseChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSprayDoseChecks: {
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
      productionOrderSprayDoseChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSprayDoseChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderSprayDoseChecksService>(
      ProductionOrderSprayDoseChecksService,
    );
  });

  it('gets spray dose checks for a production order', async () => {
    const sprayDoseChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSprayDoseChecks.findMany.mockResolvedValue(
      sprayDoseChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      sprayDoseChecks,
    );
    expect(
      prismaService.productionOrderSprayDoseChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a spray dose check by id', async () => {
    const sprayDoseCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSprayDoseChecks.findUnique.mockResolvedValue(
      sprayDoseCheck,
    );

    await expect(service.findById(1)).resolves.toBe(sprayDoseCheck);
    expect(
      prismaService.productionOrderSprayDoseChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the spray dose check does not exist', async () => {
    prismaService.productionOrderSprayDoseChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a spray dose check using the authenticated user', async () => {
    const createdSprayDoseCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSprayDoseChecks.create.mockResolvedValue(
      createdSprayDoseCheck,
    );

    const result = await service.create(
      2031,
      {
        bottle_1_spray_dose_count: '120',
        bottle_2_spray_dose_count: 121,
        bottle_3_spray_dose_count: '122',
        bottle_4_spray_dose_count: 123,
      },
      { id: 7 },
    );

    expect(result).toBe(createdSprayDoseCheck);
    expect(
      prismaService.productionOrderSprayDoseChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          bottle_1_spray_dose_count: 120,
          bottle_2_spray_dose_count: 121,
          bottle_3_spray_dose_count: 122,
          bottle_4_spray_dose_count: 123,
          unit: 'dose',
          created_by_id: 7,
        },
      }),
    );
  });

  it('throws BadRequestException when a dose count is not positive', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          bottle_1_spray_dose_count: 0,
          bottle_2_spray_dose_count: 121,
          bottle_3_spray_dose_count: 122,
          bottle_4_spray_dose_count: 123,
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
        bottle_1_spray_dose_count: 120,
        bottle_2_spray_dose_count: 121,
        bottle_3_spray_dose_count: 122,
        bottle_4_spray_dose_count: 123,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
