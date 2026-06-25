import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';

describe('ProductionOrderTenShellWeightChecksService', () => {
  let service: ProductionOrderTenShellWeightChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderTenShellWeightChecks: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const validDto = {
    ten_shells_weight: '500,04',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderTenShellWeightChecks: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderTenShellWeightChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderTenShellWeightChecksService>(
      ProductionOrderTenShellWeightChecksService,
    );
  });

  it('gets a check for a production order', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findByProductionOrder(2031)).resolves.toBe(check);
    expect(
      prismaService.productionOrderTenShellWeightChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a check does not exist', async () => {
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upserts a check with total ten-shell weight and fixed mg unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTenShellWeightChecks.upsert.mockResolvedValue(
      createdCheck,
    );

    await expect(service.upsert(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderTenShellWeightChecks.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        create: {
          production_order_id: 2031,
          ten_shells_weight: new Prisma.Decimal('500.04'),
          unit: 'mg',
          created_by_id: 7,
        },
        update: {
          ten_shells_weight: new Prisma.Decimal('500.04'),
          unit: 'mg',
        },
      }),
    );
  });

  it('rejects a missing ten-shell weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(2031, { ten_shells_weight: null }, { id: 7 }),
    ).rejects.toThrow('ten_shells_weight is required');
  });

  it('rejects a weight with more than two decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(2031, { ten_shells_weight: '500.001' }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a weight that is not greater than zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(2031, { ten_shells_weight: 0 }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.upsert(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.upsert(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
