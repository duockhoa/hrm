import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';

describe('ProductionOrderDisintegrationChecksService', () => {
  let service: ProductionOrderDisintegrationChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderDisintegrationChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderDisintegrationChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderDisintegrationChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderDisintegrationChecksService>(
      ProductionOrderDisintegrationChecksService,
    );
  });

  it('gets disintegration checks for a production order', async () => {
    const disintegrationChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDisintegrationChecks.findMany.mockResolvedValue(
      disintegrationChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      disintegrationChecks,
    );
    expect(
      prismaService.productionOrderDisintegrationChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a disintegration check by id', async () => {
    const disintegrationCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      disintegrationCheck,
    );

    await expect(service.findById(1)).resolves.toBe(disintegrationCheck);
    expect(
      prismaService.productionOrderDisintegrationChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the disintegration check does not exist', async () => {
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a disintegration check and normalizes pass results', async () => {
    const createdDisintegrationCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDisintegrationChecks.create.mockResolvedValue(
      createdDisintegrationCheck,
    );

    const result = await service.create(
      2031,
      {
        dosage_form_stage: 'film_coated_tablet',
        unit_1_passed: true,
        unit_2_passed: 'dat',
        unit_3_passed: 'Đạt',
        unit_4_passed: false,
        unit_5_passed: 'khong dat',
        unit_6_passed: 'Không đạt',
      },
      { id: 7 },
    );

    expect(result).toBe(createdDisintegrationCheck);
    expect(
      prismaService.productionOrderDisintegrationChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          dosage_form_stage: 'film_coated_tablet',
          unit_1_passed: true,
          unit_2_passed: true,
          unit_3_passed: true,
          unit_4_passed: false,
          unit_5_passed: false,
          unit_6_passed: false,
          created_by_id: 7,
        },
      }),
    );
  });

  it('creates a disintegration check with only the first unit result', async () => {
    const createdDisintegrationCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDisintegrationChecks.create.mockResolvedValue(
      createdDisintegrationCheck,
    );

    await expect(
      service.create(
        2031,
        {
          dosage_form_stage: 'tablet',
          unit_1_passed: 'Đạt',
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdDisintegrationCheck);
    expect(
      prismaService.productionOrderDisintegrationChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit_1_passed: true,
          unit_2_passed: null,
          unit_3_passed: null,
          unit_4_passed: null,
          unit_5_passed: null,
          unit_6_passed: null,
        }),
      }),
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only the provided fields and normalizes pass results', async () => {
    const updatedDisintegrationCheck = {
      id: 1,
      unit_2_passed: false,
      unit_6_passed: null,
    };
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderDisintegrationChecks.update.mockResolvedValue(
      updatedDisintegrationCheck,
    );

    await expect(
      service.update(1, {
        dosage_form_stage: ' film_coated_tablet ',
        unit_2_passed: 'Không đạt',
        unit_6_passed: null,
      }),
    ).resolves.toBe(updatedDisintegrationCheck);
    expect(
      prismaService.productionOrderDisintegrationChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          dosage_form_stage: 'film_coated_tablet',
          unit_2_passed: false,
          unit_6_passed: null,
        },
      }),
    );
  });

  it('rejects an update without any supported fields', async () => {
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('deletes an existing disintegration check', async () => {
    const deletedDisintegrationCheck = { id: 1 };
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      { id: 1 },
    );
    prismaService.productionOrderDisintegrationChecks.delete.mockResolvedValue(
      deletedDisintegrationCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedDisintegrationCheck);
    expect(
      prismaService.productionOrderDisintegrationChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('throws NotFoundException when updating a missing check', async () => {
    prismaService.productionOrderDisintegrationChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, { unit_1_passed: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when a pass result is invalid', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          dosage_form_stage: 'tablet',
          unit_1_passed: true,
          unit_2_passed: true,
          unit_3_passed: true,
          unit_4_passed: true,
          unit_5_passed: true,
          unit_6_passed: 'maybe',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when the first unit result is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          dosage_form_stage: 'tablet',
          unit_2_passed: true,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        dosage_form_stage: 'tablet',
        unit_1_passed: true,
        unit_2_passed: true,
        unit_3_passed: true,
        unit_4_passed: true,
        unit_5_passed: true,
        unit_6_passed: true,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
