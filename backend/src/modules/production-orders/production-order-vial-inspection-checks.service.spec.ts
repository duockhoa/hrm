import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';

describe('ProductionOrderVialInspectionChecksService', () => {
  let service: ProductionOrderVialInspectionChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderVialInspectionChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    bag_number: '1',
    fiber_vial_count: 1,
    particulate_count: '2',
    damaged_count: 0,
    other_defect_count: '3',
    note: ' can theo doi ',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderVialInspectionChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderVialInspectionChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderVialInspectionChecksService>(
      ProductionOrderVialInspectionChecksService,
    );
  });

  it('gets vial inspection checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVialInspectionChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderVialInspectionChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a vial inspection check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a vial inspection check does not exist', async () => {
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a vial inspection check with normalized data', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVialInspectionChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderVialInspectionChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          bag_number: 1,
          fiber_vial_count: 1,
          particulate_count: 2,
          damaged_count: 0,
          other_defect_count: 3,
          note: 'can theo doi',
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates a vial inspection check with normalized partial data', async () => {
    const existingCheck = { id: 1, production_order_id: 2031 };
    const updatedCheck = { id: 1, bag_number: 2, note: null };
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      existingCheck,
    );
    prismaService.productionOrderVialInspectionChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        bag_number: '2',
        particulate_count: '4',
        note: '',
      }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderVialInspectionChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          bag_number: 2,
          particulate_count: 4,
          note: null,
        },
      }),
    );
  });

  it('rejects an empty vial inspection update payload', async () => {
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('rejects invalid vial inspection update values', async () => {
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { fiber_vial_count: '-1' })).rejects.toThrow(
      'fiber_vial_count must be a non-negative integer',
    );
  });

  it('throws NotFoundException when updating a missing vial inspection check', async () => {
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.update(1, { bag_number: 2 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a vial inspection check', async () => {
    const existingCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      existingCheck,
    );
    prismaService.productionOrderVialInspectionChecks.delete.mockResolvedValue(
      existingCheck,
    );

    await expect(service.delete(1)).resolves.toBe(existingCheck);
    expect(
      prismaService.productionOrderVialInspectionChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('throws NotFoundException when deleting a missing vial inspection check', async () => {
    prismaService.productionOrderVialInspectionChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.delete(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a missing bag number', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, bag_number: '' }, { id: 7 }),
    ).rejects.toThrow('bag_number is required');
  });

  it('rejects a bag number that is not greater than zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, bag_number: 0 }, { id: 7 }),
    ).rejects.toThrow('bag_number must be greater than 0');
  });

  it('rejects a negative or decimal count', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, particulate_count: '1.5' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-string note', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, note: 1 as any }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
