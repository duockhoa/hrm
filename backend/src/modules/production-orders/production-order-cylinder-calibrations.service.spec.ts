import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';

describe('ProductionOrderCylinderCalibrationsService', () => {
  let service: ProductionOrderCylinderCalibrationsService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderCylinderCalibrations: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderCylinderCalibrations: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderCylinderCalibrationsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderCylinderCalibrationsService>(
      ProductionOrderCylinderCalibrationsService,
    );
  });

  it('gets a cylinder calibration for a production order', async () => {
    const calibration = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderCylinderCalibrations.findUnique.mockResolvedValue(
      calibration,
    );

    await expect(service.findByProductionOrder(2031)).resolves.toBe(
      calibration,
    );
    expect(
      prismaService.productionOrderCylinderCalibrations.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('returns null when the production order has no cylinder calibration yet', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderCylinderCalibrations.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findByProductionOrder(2031)).resolves.toBeNull();
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upserts a normalized cylinder calibration', async () => {
    const calibration = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderCylinderCalibrations.upsert.mockResolvedValue(
      calibration,
    );

    await expect(
      service.upsert(
        2031,
        {
          cylinder_code: ' OD-001 ',
          calibration_number: '0,1234',
        },
        { id: '7' },
      ),
    ).resolves.toBe(calibration);

    const upsertArg =
      prismaService.productionOrderCylinderCalibrations.upsert.mock.calls[0][0];

    expect(upsertArg.where).toEqual({
      production_order_id: 2031,
    });
    expect(upsertArg.create).toEqual(
      expect.objectContaining({
        production_order_id: 2031,
        cylinder_code: 'OD-001',
        calibration_number: new Prisma.Decimal('0.1234'),
        created_by_id: 7,
      }),
    );
    expect(upsertArg.update).toEqual({
      cylinder_code: 'OD-001',
      calibration_number: new Prisma.Decimal('0.1234'),
    });
  });

  it('upserts a cylinder calibration without a cylinder code', async () => {
    const calibration = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderCylinderCalibrations.upsert.mockResolvedValue(
      calibration,
    );

    await expect(
      service.upsert(
        2031,
        {
          calibration_number: '0.1234',
        },
        { id: 7 },
      ),
    ).resolves.toBe(calibration);

    const upsertArg =
      prismaService.productionOrderCylinderCalibrations.upsert.mock.calls[0][0];

    expect(upsertArg.create).toEqual(
      expect.objectContaining({
        cylinder_code: null,
        calibration_number: new Prisma.Decimal('0.1234'),
      }),
    );
    expect(upsertArg.update).toEqual({
      cylinder_code: null,
      calibration_number: new Prisma.Decimal('0.1234'),
    });
  });

  it('allows a negative calibration number', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderCylinderCalibrations.upsert.mockResolvedValue({
      id: 1,
    });

    await service.upsert(
      2031,
      {
        cylinder_code: 'OD-001',
        calibration_number: '-0.1234',
      },
      { id: 7 },
    );

    const upsertArg =
      prismaService.productionOrderCylinderCalibrations.upsert.mock.calls[0][0];
    expect(upsertArg.create.calibration_number.toString()).toBe('-0.1234');
  });

  it('rejects a calibration number with more than four decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(
        2031,
        {
          cylinder_code: 'OD-001',
          calibration_number: '0.12345',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cylinder code longer than 100 characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(
        2031,
        {
          cylinder_code: 'A'.repeat(101),
          calibration_number: '0.1234',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.upsert(2031, {
        cylinder_code: 'OD-001',
        calibration_number: '0.1234',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
