import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';

describe('ProductionOrderSemiFinishedGrossWeightChecksService', () => {
  let service: ProductionOrderSemiFinishedGrossWeightChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderSemiFinishedProductGrossWeightChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    requirement: 'Khối lượng cả vỏ từ 0.480 g đến 0.520 g',
    unit_1_gross_weight: 0.501,
    unit_2_gross_weight: '0,498',
    unit_3_gross_weight: 0.503,
    unit_4_gross_weight: 0.5,
    unit_5_gross_weight: 0.499,
    unit_6_gross_weight: 0.502,
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderSemiFinishedProductGrossWeightChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSemiFinishedGrossWeightChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderSemiFinishedGrossWeightChecksService>(
      ProductionOrderSemiFinishedGrossWeightChecksService,
    );
  });

  it('gets checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks
        .findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('creates a check with requirement, weights and fixed g unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: validDto.requirement,
          unit_1_gross_weight: new Prisma.Decimal('0.501'),
          unit_2_gross_weight: new Prisma.Decimal('0.498'),
          unit_3_gross_weight: new Prisma.Decimal('0.503'),
          unit_4_gross_weight: new Prisma.Decimal('0.5'),
          unit_5_gross_weight: new Prisma.Decimal('0.499'),
          unit_6_gross_weight: new Prisma.Decimal('0.502'),
          unit: 'g',
          created_by_id: 7,
        },
      }),
    );
  });

  it('creates a check with only unit 1 weight', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          requirement: validDto.requirement,
          unit_1_gross_weight: 0.501,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit_1_gross_weight: new Prisma.Decimal('0.501'),
          unit_2_gross_weight: null,
          unit_3_gross_weight: null,
          unit_4_gross_weight: null,
          unit_5_gross_weight: null,
          unit_6_gross_weight: null,
        }),
      }),
    );
  });

  it('updates only provided fields', async () => {
    const updatedCheck = { id: 1, unit_3_gross_weight: '0.515' };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        requirement: 'Yêu cầu mới',
        unit_3_gross_weight: '0,515',
      }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: 'Yêu cầu mới',
          unit_3_gross_weight: new Prisma.Decimal('0.515'),
        },
      }),
    );
  });

  it('clears an optional gross weight on update', async () => {
    const updatedCheck = { id: 1, unit_3_gross_weight: null };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { unit_3_gross_weight: null }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          unit_3_gross_weight: null,
        },
      }),
    );
  });

  it('deletes a check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.delete.mockResolvedValue(
      deletedCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedCheck);
  });

  it('rejects an empty requirement', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, requirement: '  ' }, { id: 7 }),
    ).rejects.toThrow('requirement is required');
  });

  it('rejects a missing unit 1 gross weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit_1_gross_weight: null },
        { id: 7 },
      ),
    ).rejects.toThrow('unit_1_gross_weight is required');
  });

  it('rejects a weight with more than three decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit_1_gross_weight: '0.5001' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-positive weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit_1_gross_weight: 0 }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when a check does not exist', async () => {
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
