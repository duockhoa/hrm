import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderLeakTightnessChecksService } from './production-order-leak-tightness-checks.service';

describe('ProductionOrderLeakTightnessChecksService', () => {
  let service: ProductionOrderLeakTightnessChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderLeakTightnessChecks: {
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
      productionOrderLeakTightnessChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderLeakTightnessChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderLeakTightnessChecksService);
  });

  it('gets checks for a production order newest first', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderLeakTightnessChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderLeakTightnessChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('creates a check and normalizes supported result values', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderLeakTightnessChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          requirement: '  Không được rò rỉ  ',
          dosage_form_stage: ' film_coated_tablet ',
          unit_1_result: true,
          unit_2_result: 'đạt',
          unit_3_result: 'không kín',
          unit_10_result: 0,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderLeakTightnessChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: 'Không được rò rỉ',
          dosage_form_stage: 'film_coated_tablet',
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

  it('updates only provided fields and can clear an optional result', async () => {
    const updatedCheck = { id: 1, unit_2_result: null };
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderLeakTightnessChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { requirement: '', unit_2_result: null }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderLeakTightnessChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { requirement: null, unit_2_result: null },
      }),
    );
  });

  it('can clear dosage form stage on update', async () => {
    const updatedCheck = { id: 1, dosage_form_stage: null };
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderLeakTightnessChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { dosage_form_stage: '  ' })).resolves.toBe(
      updatedCheck,
    );
    expect(
      prismaService.productionOrderLeakTightnessChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { dosage_form_stage: null },
      }),
    );
  });

  it('deletes an existing check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderLeakTightnessChecks.delete.mockResolvedValue(
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

  it('rejects an invalid dosage form stage', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          dosage_form_stage: 123 as unknown as string,
          unit_1_result: true,
        },
        { id: 7 },
      ),
    ).rejects.toThrow('dosage_form_stage must be a string');
  });

  it('rejects a dosage form stage longer than 50 characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          dosage_form_stage: 'a'.repeat(51),
          unit_1_result: true,
        },
        { id: 7 },
      ),
    ).rejects.toThrow('dosage_form_stage must be at most 50 characters');
  });

  it('rejects clearing unit 1 on update', async () => {
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { unit_1_result: null })).rejects.toThrow(
      'unit_1_result is required',
    );
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
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
    prismaService.productionOrderLeakTightnessChecks.findUnique.mockResolvedValue(
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
