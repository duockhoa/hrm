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
    dosage_form_stage: 'film_coated_tablet',
    unit: 'mg',
    unit_1_gross_weight: 0.501,
    unit_2_gross_weight: '0,498',
    unit_3_gross_weight: 0.503,
    unit_4_gross_weight: 0.5,
    unit_5_gross_weight: 0.499,
    unit_6_gross_weight: 0.502,
    unit_7_gross_weight: 0.497,
    unit_8_gross_weight: 0.504,
    unit_9_gross_weight: 0.496,
    unit_10_gross_weight: 0.505,
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

  it('creates a check with requirement, weights and frontend unit', async () => {
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
          dosage_form_stage: 'film_coated_tablet',
          unit_1_gross_weight: new Prisma.Decimal('0.501'),
          unit_2_gross_weight: new Prisma.Decimal('0.498'),
          unit_3_gross_weight: new Prisma.Decimal('0.503'),
          unit_4_gross_weight: new Prisma.Decimal('0.5'),
          unit_5_gross_weight: new Prisma.Decimal('0.499'),
          unit_6_gross_weight: new Prisma.Decimal('0.502'),
          unit_7_gross_weight: new Prisma.Decimal('0.497'),
          unit_8_gross_weight: new Prisma.Decimal('0.504'),
          unit_9_gross_weight: new Prisma.Decimal('0.496'),
          unit_10_gross_weight: new Prisma.Decimal('0.505'),
          unit: 'mg',
          created_by_id: 7,
        },
      }),
    );
  });

  it('creates a check with only unit 1 weight and no requirement', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
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
          requirement: null,
          dosage_form_stage: null,
          unit: 'g',
          unit_1_gross_weight: new Prisma.Decimal('0.501'),
          unit_2_gross_weight: null,
          unit_3_gross_weight: null,
          unit_4_gross_weight: null,
          unit_5_gross_weight: null,
          unit_6_gross_weight: null,
          unit_7_gross_weight: null,
          unit_8_gross_weight: null,
          unit_9_gross_weight: null,
          unit_10_gross_weight: null,
        }),
      }),
    );
  });

  it('updates only provided fields', async () => {
    const updatedCheck = { id: 1, unit_10_gross_weight: '0.515', unit: 'mg' };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        requirement: 'Yêu cầu mới',
        dosage_form_stage: ' tablet ',
        unit: ' mg ',
        unit_10_gross_weight: '0,515',
      }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: 'Yêu cầu mới',
          dosage_form_stage: 'tablet',
          unit: 'mg',
          unit_10_gross_weight: new Prisma.Decimal('0.515'),
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

  it('clears requirement on update', async () => {
    const updatedCheck = { id: 1, requirement: null };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { requirement: '  ' })).resolves.toBe(
      updatedCheck,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: null,
        },
      }),
    );
  });

  it('clears dosage form stage on update', async () => {
    const updatedCheck = { id: 1, dosage_form_stage: null };
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { dosage_form_stage: '  ' }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          dosage_form_stage: null,
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

  it('rejects a non-string requirement', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, requirement: 123 as unknown as string },
        { id: 7 },
      ),
    ).rejects.toThrow('requirement must be a string');
  });

  it('rejects a non-string dosage form stage', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, dosage_form_stage: 123 as unknown as string },
        { id: 7 },
      ),
    ).rejects.toThrow('dosage_form_stage must be a string');
  });

  it('rejects a dosage form stage longer than 50 characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, dosage_form_stage: 'a'.repeat(51) },
        { id: 7 },
      ),
    ).rejects.toThrow('dosage_form_stage must be at most 50 characters');
  });

  it('rejects a non-string unit', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit: 1 as unknown as string },
        { id: 7 },
      ),
    ).rejects.toThrow('unit must be a string');
  });

  it('rejects clearing unit on update', async () => {
    prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { unit: '  ' })).rejects.toThrow(
      'unit is required',
    );
  });

  it('rejects a unit longer than ten characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit: 'kilograms-1' }, { id: 7 }),
    ).rejects.toThrow('unit must be at most 10 characters');
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
