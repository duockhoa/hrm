import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderHardnessChecksService } from './production-order-hardness-checks.service';

describe('ProductionOrderHardnessChecksService', () => {
  let service: ProductionOrderHardnessChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderHardnessChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    requirement: 'Độ cứng từ 70 N đến 90 N',
    dosage_form_stage: 'tablet',
    unit_1_hardness: 80.1,
    unit_2_hardness: '79,8',
    unit_3_hardness: 81,
    unit_10_hardness: 82.5,
    unit: 'N',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderHardnessChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderHardnessChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderHardnessChecksService>(
      ProductionOrderHardnessChecksService,
    );
  });

  it('gets checks for a production order newest first', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHardnessChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(prismaService.productionOrderHardnessChecks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('creates a check and normalizes hardness values', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHardnessChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(prismaService.productionOrderHardnessChecks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: 'Độ cứng từ 70 N đến 90 N',
          dosage_form_stage: 'tablet',
          unit_1_hardness: new Prisma.Decimal('80.1'),
          unit_2_hardness: new Prisma.Decimal('79.8'),
          unit_3_hardness: new Prisma.Decimal('81'),
          unit_4_hardness: null,
          unit_5_hardness: null,
          unit_6_hardness: null,
          unit_7_hardness: null,
          unit_8_hardness: null,
          unit_9_hardness: null,
          unit_10_hardness: new Prisma.Decimal('82.5'),
          unit: 'N',
          created_by_id: 7,
        },
      }),
    );
  });

  it('defaults unit to N and allows only unit 1 hardness on create', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderHardnessChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(2031, { unit_1_hardness: '80' }, { id: 7 }),
    ).resolves.toBe(createdCheck);
    expect(prismaService.productionOrderHardnessChecks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requirement: null,
          dosage_form_stage: null,
          unit_1_hardness: new Prisma.Decimal('80'),
          unit_2_hardness: null,
          unit_10_hardness: null,
          unit: 'N',
        }),
      }),
    );
  });

  it('updates only provided fields and can clear optional hardness', async () => {
    const updatedCheck = { id: 1, unit_3_hardness: null };
    prismaService.productionOrderHardnessChecks.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.productionOrderHardnessChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        requirement: 'Yêu cầu mới',
        dosage_form_stage: ' film_coated_tablet ',
        unit_3_hardness: null,
        unit_10_hardness: '83,2',
        unit: ' N ',
      }),
    ).resolves.toBe(updatedCheck);
    expect(prismaService.productionOrderHardnessChecks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          requirement: 'Yêu cầu mới',
          dosage_form_stage: 'film_coated_tablet',
          unit: 'N',
          unit_3_hardness: null,
          unit_10_hardness: new Prisma.Decimal('83.2'),
        },
      }),
    );
  });

  it('rejects a missing unit 1 hardness', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit_1_hardness: null }, { id: 7 }),
    ).rejects.toThrow('unit_1_hardness is required');
  });

  it('rejects a hardness with more than three decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, unit_1_hardness: '80.1234' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-positive hardness', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, unit_1_hardness: 0 }, { id: 7 }),
    ).rejects.toThrow('unit_1_hardness must be greater than 0');
  });

  it('rejects an invalid dosage form stage', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, dosage_form_stage: 123 as unknown as string },
        { id: 7 },
      ),
    ).rejects.toThrow('dosage_form_stage must be a string');
  });

  it('rejects clearing unit 1 on update', async () => {
    prismaService.productionOrderHardnessChecks.findUnique.mockResolvedValue({
      id: 1,
    });

    await expect(
      service.update(1, { unit_1_hardness: null }),
    ).rejects.toThrow('unit_1_hardness is required');
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderHardnessChecks.findUnique.mockResolvedValue({
      id: 1,
    });

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the check does not exist', async () => {
    prismaService.productionOrderHardnessChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.update(1, { unit_2_hardness: 80 })).rejects.toThrow(
      'Hardness check not found',
    );
  });

  it('throws when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, validDto, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
