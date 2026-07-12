import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderTenUnitSensoryChecksService } from './production-order-ten-unit-sensory-checks.service';

describe('ProductionOrderTenUnitSensoryChecksService', () => {
  let service: ProductionOrderTenUnitSensoryChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderTenUnitSensoryChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderTenUnitSensoryChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderTenUnitSensoryChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderTenUnitSensoryChecksService);
  });

  it('gets checks for a production order newest first', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTenUnitSensoryChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderTenUnitSensoryChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('creates a check and normalizes supported result values', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTenUnitSensoryChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          requirement: '  Đạt yêu cầu cảm quan  ',
          unit_1_result: true,
          unit_2_result: 'đạt',
          unit_3_result: 'không đạt',
          unit_10_result: 0,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderTenUnitSensoryChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: 'Đạt yêu cầu cảm quan',
          unit_1_result: true,
          unit_2_result: true,
          unit_3_result: false,
          unit_4_result: null,
          unit_5_result: null,
          unit_6_result: null,
          unit_7_result: null,
          unit_8_result: null,
          unit_9_result: null,
          unit_10_result: false,
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates only provided fields and can clear optional values', async () => {
    const updatedCheck = { id: 1, unit_2_result: null };
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderTenUnitSensoryChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { requirement: '', unit_2_result: null }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderTenUnitSensoryChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { requirement: null, unit_2_result: null },
      }),
    );
  });

  it('deletes an existing check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderTenUnitSensoryChecks.delete.mockResolvedValue(
      deletedCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedCheck);
  });

  it('rejects a missing unit 1 result', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { unit_1_result: null }, { id: 7 }),
    ).rejects.toThrow('unit_1_result is required');
  });

  it('rejects an invalid result', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { unit_1_result: 'maybe' }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects clearing unit 1 on update', async () => {
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { unit_1_result: null })).rejects.toThrow(
      'unit_1_result is required',
    );
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, { unit_1_result: true }, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the check does not exist', async () => {
    prismaService.productionOrderTenUnitSensoryChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { unit_1_result: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
