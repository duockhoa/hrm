import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';

describe('ProductionOrderShellWeightChecksService', () => {
  let service: ProductionOrderShellWeightChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderShellWeightChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const validDto = {
    shell_1_weight: 50.01,
    shell_2_weight: '50,02',
    shell_3_weight: 49.98,
    shell_4_weight: 50,
    shell_5_weight: 50.03,
    shell_6_weight: 49.99,
    shell_7_weight: 50.04,
    shell_8_weight: 49.97,
    shell_9_weight: 50.05,
    shell_10_weight: 49.96,
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderShellWeightChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderShellWeightChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderShellWeightChecksService>(
      ProductionOrderShellWeightChecksService,
    );
  });

  it('gets checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderShellWeightChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderShellWeightChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderShellWeightChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a check does not exist', async () => {
    prismaService.productionOrderShellWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a check with ten weights and fixed mg unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderShellWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderShellWeightChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          shell_1_weight: new Prisma.Decimal('50.01'),
          shell_2_weight: new Prisma.Decimal('50.02'),
          shell_3_weight: new Prisma.Decimal('49.98'),
          shell_4_weight: new Prisma.Decimal('50'),
          shell_5_weight: new Prisma.Decimal('50.03'),
          shell_6_weight: new Prisma.Decimal('49.99'),
          shell_7_weight: new Prisma.Decimal('50.04'),
          shell_8_weight: new Prisma.Decimal('49.97'),
          shell_9_weight: new Prisma.Decimal('50.05'),
          shell_10_weight: new Prisma.Decimal('49.96'),
          unit: 'mg',
          created_by_id: 7,
        },
      }),
    );
  });

  it('rejects a missing shell weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, shell_10_weight: null }, { id: 7 }),
    ).rejects.toThrow('shell_10_weight is required');
  });

  it('rejects a weight with more than two decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, shell_1_weight: '50.001' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a weight that is not greater than zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, shell_1_weight: 0 }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates only the provided shell weights', async () => {
    const existingCheck = { id: 1, production_order_id: 2031 };
    const updatedCheck = { ...existingCheck, shell_2_weight: '51.25' };
    prismaService.productionOrderShellWeightChecks.findUnique.mockResolvedValue(
      existingCheck,
    );
    prismaService.productionOrderShellWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { shell_2_weight: '51,25' })).resolves.toBe(
      updatedCheck,
    );
    expect(
      prismaService.productionOrderShellWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { shell_2_weight: new Prisma.Decimal('51.25') },
      }),
    );
  });

  it('rejects an empty shell weight update', async () => {
    prismaService.productionOrderShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws NotFoundException when updating a missing shell weight check', async () => {
    prismaService.productionOrderShellWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, { shell_1_weight: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
