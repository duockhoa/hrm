import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSemiFinishedProductSummariesService } from './production-order-semi-finished-product-summaries.service';

describe('ProductionOrderSemiFinishedProductSummariesService', () => {
  let service: ProductionOrderSemiFinishedProductSummariesService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderSemiFinishedProductSummaries: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    stage: 'Đóng gói',
    input_quantity: '100,5',
    input_unit: 'kg',
    load_quantity: '10',
    load_unit: 'tải',
    packed_quantity: '95',
    packed_unit: 'thùng',
    leftover_quantity: 3,
    leftover_unit: 'gói',
    waste_quantity: '2.5',
    waste_unit: 'g',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderSemiFinishedProductSummaries: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSemiFinishedProductSummariesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderSemiFinishedProductSummariesService>(
      ProductionOrderSemiFinishedProductSummariesService,
    );
  });

  it('gets summaries for a production order', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductSummaries.findMany.mockResolvedValue(
      summaries,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      summaries,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a summary by id', async () => {
    const summary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSemiFinishedProductSummaries.findUnique.mockResolvedValue(
      summary,
    );

    await expect(service.findById(1)).resolves.toBe(summary);
  });

  it('creates a summary with frontend units', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdSummary,
    );
    expect(
      prismaService.productionOrderSemiFinishedProductSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          stage: 'Đóng gói',
          input_quantity: new Prisma.Decimal('100.5'),
          input_unit: 'kg',
          load_quantity: new Prisma.Decimal('10'),
          load_unit: 'tải',
          packed_quantity: new Prisma.Decimal('95'),
          packed_unit: 'thùng',
          leftover_quantity: new Prisma.Decimal('3'),
          leftover_unit: 'gói',
          waste_quantity: new Prisma.Decimal('2.5'),
          waste_unit: 'g',
          created_by_id: 7,
        },
      }),
    );
  });

  it('defaults missing create units to kg', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSemiFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await expect(
      service.create(
        2031,
        {
          input_quantity: 1,
          load_quantity: 10,
          packed_quantity: 2,
          leftover_quantity: 3,
          waste_quantity: 4,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdSummary);
    expect(
      prismaService.productionOrderSemiFinishedProductSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          input_unit: 'kg',
          load_unit: 'kg',
          packed_unit: 'kg',
          leftover_unit: 'kg',
          waste_unit: 'kg',
        }),
      }),
    );
  });

  it('updates only provided fields including frontend units', async () => {
    const updatedSummary = { id: 1, input_unit: 'g', waste_quantity: '1.25' };
    prismaService.productionOrderSemiFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderSemiFinishedProductSummaries.update.mockResolvedValue(
      updatedSummary,
    );

    await expect(
      service.update(1, {
        load_unit: ' tải ',
        input_unit: ' g ',
        waste_quantity: '1,25',
      }),
    ).resolves.toBe(updatedSummary);
    expect(
      prismaService.productionOrderSemiFinishedProductSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          waste_quantity: new Prisma.Decimal('1.25'),
          load_unit: 'tải',
          input_unit: 'g',
        },
      }),
    );
  });

  it('rejects a non-string unit', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, input_unit: 1 as unknown as string },
        { id: 7 },
      ),
    ).rejects.toThrow('input_unit must be a string');
  });

  it('rejects clearing a unit on update', async () => {
    prismaService.productionOrderSemiFinishedProductSummaries.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, { packed_unit: '  ' })).rejects.toThrow(
      'packed_unit is required',
    );
  });

  it('rejects a unit longer than twenty characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, waste_unit: '123456789012345678901' },
        { id: 7 },
      ),
    ).rejects.toThrow('waste_unit must be at most 20 characters');
  });

  it('rejects a quantity with more than three decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        { ...validDto, input_quantity: '100.1234' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty update', async () => {
    prismaService.productionOrderSemiFinishedProductSummaries.findUnique.mockResolvedValue(
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

  it('throws NotFoundException when a summary does not exist', async () => {
    prismaService.productionOrderSemiFinishedProductSummaries.findUnique.mockResolvedValue(
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
