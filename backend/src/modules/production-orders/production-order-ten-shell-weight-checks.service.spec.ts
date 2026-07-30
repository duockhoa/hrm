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
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    ten_shells_weight: '500,04',
    unit: 'g',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderTenShellWeightChecks: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

  it('upserts a check with total ten-shell weight and frontend unit', async () => {
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
          unit: 'g',
          created_by_id: 7,
        },
        update: {
          ten_shells_weight: new Prisma.Decimal('500.04'),
          unit: 'g',
        },
      }),
    );
  });

  it('defaults a missing create unit to mg without resetting existing unit', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    const dtoWithoutUnit = { ten_shells_weight: validDto.ten_shells_weight };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTenShellWeightChecks.upsert.mockResolvedValue(
      createdCheck,
    );

    await expect(service.upsert(2031, dtoWithoutUnit, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderTenShellWeightChecks.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          unit: 'mg',
        }),
        update: {
          ten_shells_weight: new Prisma.Decimal('500.04'),
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

  it('updates a ten-shell weight check', async () => {
    const updatedCheck = { id: 1, ten_shells_weight: '510.25' };
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );
    prismaService.productionOrderTenShellWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, { ten_shells_weight: '510,25' }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderTenShellWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          ten_shells_weight: new Prisma.Decimal('510.25'),
        },
      }),
    );
  });

  it('updates a ten-shell weight unit from frontend', async () => {
    const updatedCheck = { id: 1, unit: 'mg' };
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );
    prismaService.productionOrderTenShellWeightChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(service.update(1, { unit: ' mg ' })).resolves.toBe(
      updatedCheck,
    );
    expect(
      prismaService.productionOrderTenShellWeightChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          unit: 'mg',
        },
      }),
    );
  });

  it('rejects clearing a ten-shell weight unit', async () => {
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );

    await expect(service.update(1, { unit: '  ' })).rejects.toThrow(
      'unit is required',
    );
  });

  it('rejects a ten-shell weight unit longer than ten characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(2031, { ...validDto, unit: '12345678901' }, { id: 7 }),
    ).rejects.toThrow('unit must be at most 10 characters');
  });

  it('rejects an empty ten-shell weight update', async () => {
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws NotFoundException when updating a missing ten-shell weight check', async () => {
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, { ten_shells_weight: 510.25 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an existing ten-shell weight check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );
    prismaService.productionOrderTenShellWeightChecks.delete.mockResolvedValue(
      deletedCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedCheck);
    expect(
      prismaService.productionOrderTenShellWeightChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('throws NotFoundException when deleting a missing ten-shell weight check', async () => {
    prismaService.productionOrderTenShellWeightChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.delete(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
