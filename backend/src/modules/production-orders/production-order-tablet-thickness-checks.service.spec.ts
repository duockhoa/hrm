import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderTabletThicknessChecksService } from './production-order-tablet-thickness-checks.service';

describe('ProductionOrderTabletThicknessChecksService', () => {
  let service: ProductionOrderTabletThicknessChecksService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderTabletThicknessChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderTabletThicknessChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderTabletThicknessChecksService);
  });

  it('creates a tablet thickness check with ten-unit support and mm default', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderTabletThicknessChecks.create.mockResolvedValue(
      {
        id: 1,
      },
    );

    await service.create(
      2031,
      {
        requirement: 'Chiều dày từ 4.0 mm đến 4.4 mm',
        dosage_form_stage: 'tablet',
        unit_1_thickness: 4.2,
        unit_2_thickness: '4,1',
        unit_10_thickness: '4.3',
      },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderTabletThicknessChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          requirement: 'Chiều dày từ 4.0 mm đến 4.4 mm',
          dosage_form_stage: 'tablet',
          unit_1_thickness: new Prisma.Decimal('4.2'),
          unit_2_thickness: new Prisma.Decimal('4.1'),
          unit_3_thickness: null,
          unit_4_thickness: null,
          unit_5_thickness: null,
          unit_6_thickness: null,
          unit_7_thickness: null,
          unit_8_thickness: null,
          unit_9_thickness: null,
          unit_10_thickness: new Prisma.Decimal('4.3'),
          unit: 'mm',
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates only supplied values and clears optional thickness', async () => {
    prismaService.productionOrderTabletThicknessChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderTabletThicknessChecks.update.mockResolvedValue(
      {
        id: 1,
      },
    );

    await service.update(1, {
      requirement: ' Yêu cầu mới ',
      unit_2_thickness: null,
      unit_10_thickness: '4,5',
      unit: ' mm ',
    });

    expect(
      prismaService.productionOrderTabletThicknessChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          requirement: 'Yêu cầu mới',
          unit_2_thickness: null,
          unit_10_thickness: new Prisma.Decimal('4.5'),
          unit: 'mm',
        },
      }),
    );
  });

  it('rejects a missing first thickness value', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { unit_1_thickness: null }, { id: 7 }),
    ).rejects.toThrow('unit_1_thickness is required');
  });

  it('rejects invalid thickness values', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { unit_1_thickness: '4.1234' }, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when the check does not exist', async () => {
    prismaService.productionOrderTabletThicknessChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
