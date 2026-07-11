import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSemiFinishedNetWeightChecksService } from './production-order-semi-finished-net-weight-checks.service';

describe('ProductionOrderSemiFinishedNetWeightChecksService', () => {
  let service: ProductionOrderSemiFinishedNetWeightChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderSemiFinishedProductNetWeightChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    requirement: 'Khối lượng không vỏ từ 0.380 g đến 0.420 g',
    unit_1_net_weight: 0.401,
    unit_2_net_weight: '0,398',
    unit_3_net_weight: 0.403,
    unit_4_net_weight: 0.4,
    unit_5_net_weight: 0.399,
    unit_6_net_weight: 0.402,
    unit: 'mg',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderSemiFinishedProductNetWeightChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSemiFinishedNetWeightChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderSemiFinishedNetWeightChecksService>(
      ProductionOrderSemiFinishedNetWeightChecksService,
    );
  });

  it('gets checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('creates a check with requirement, weights and a custom unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: validDto.requirement,
          unit_1_net_weight: new Prisma.Decimal('0.401'),
          unit_2_net_weight: new Prisma.Decimal('0.398'),
          unit_3_net_weight: new Prisma.Decimal('0.403'),
          unit_4_net_weight: new Prisma.Decimal('0.4'),
          unit_5_net_weight: new Prisma.Decimal('0.399'),
          unit_6_net_weight: new Prisma.Decimal('0.402'),
          unit: 'mg',
          created_by_id: 7,
        },
      }),
    );
  });

  it('creates a check with only unit 1 weight, no requirement and default g unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          unit_1_net_weight: 0.401,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requirement: null,
          unit_1_net_weight: new Prisma.Decimal('0.401'),
          unit_2_net_weight: null,
          unit_3_net_weight: null,
          unit_4_net_weight: null,
          unit_5_net_weight: null,
          unit_6_net_weight: null,
          unit: 'g',
        }),
      }),
    );
  });

  it('updates only provided fields including unit', async () => {
    const updatedCheck = { id: 1, unit_3_net_weight: '0.415', unit: 'mg' };
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        requirement: 'Yêu cầu mới',
        unit_3_net_weight: '0,415',
        unit: ' mg ',
      }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: 'Yêu cầu mới',
          unit_3_net_weight: new Prisma.Decimal('0.415'),
          unit: 'mg',
        },
      }),
    );
  });

  it('clears an optional net weight on update', async () => {
    const updatedCheck = { id: 1, unit_3_net_weight: null };
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { unit_3_net_weight: null }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          unit_3_net_weight: null,
        },
      }),
    );
  });

  it('clears requirement on update', async () => {
    const updatedCheck = { id: 1, requirement: null };
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { requirement: null })).resolves.toBe(
      updatedCheck,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductNetWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: null,
        },
      }),
    );
  });

  it('deletes a check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.delete.mockResolvedValue(
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

  it('rejects a missing unit 1 net weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit_1_net_weight: null },
        { id: 7 },
      ),
    ).rejects.toThrow('unit_1_net_weight is required');
  });

  it('rejects a weight with more than three decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit_1_net_weight: '0.4001' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-positive weight', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit_1_net_weight: 0 }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty unit on update', async () => {
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { unit: '  ' })).rejects.toThrow(
      'unit is required',
    );
  });

  it('rejects a unit longer than the database column', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit: 'microgramsx' }, { id: 7 }),
    ).rejects.toThrow('unit must be at most 10 characters');
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
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
    prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique.mockResolvedValue(
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
