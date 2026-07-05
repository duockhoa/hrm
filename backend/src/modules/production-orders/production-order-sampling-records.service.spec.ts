import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSamplingRecordsService } from './production-order-sampling-records.service';

describe('ProductionOrderSamplingRecordsService', () => {
  let service: ProductionOrderSamplingRecordsService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSamplingRecords: {
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
      productionOrderSamplingRecords: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSamplingRecordsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderSamplingRecordsService>(
      ProductionOrderSamplingRecordsService,
    );
  });

  it('gets sampling records for a production order', async () => {
    const samplingRecords = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSamplingRecords.findMany.mockResolvedValue(
      samplingRecords,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      samplingRecords,
    );
    expect(
      prismaService.productionOrderSamplingRecords.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets a sampling record by id', async () => {
    const samplingRecord = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSamplingRecords.findUnique.mockResolvedValue(
      samplingRecord,
    );

    await expect(service.findById(1)).resolves.toBe(samplingRecord);
    expect(
      prismaService.productionOrderSamplingRecords.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the sampling record does not exist', async () => {
    prismaService.productionOrderSamplingRecords.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a sampling record using the authenticated user', async () => {
    const createdSamplingRecord = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSamplingRecords.create.mockResolvedValue(
      createdSamplingRecord,
    );

    const result = await service.create(
      2031,
      {
        sampling_type: 'Dinh ky',
        quantity: '12,5',
        unit: 'mau',
      },
      { id: 7 },
    );

    expect(result).toBe(createdSamplingRecord);
    expect(
      prismaService.productionOrderSamplingRecords.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2031,
          sampling_type: 'Dinh ky',
          unit: 'mau',
          created_by_id: 7,
        }),
      }),
    );
    expect(
      prismaService.productionOrderSamplingRecords.create.mock.calls[0][0].data
        .quantity.toString(),
    ).toBe('12.5');
  });

  it('updates provided sampling record fields', async () => {
    const updatedSamplingRecord = { id: 1, sampling_type: 'Dot xuat' };
    prismaService.productionOrderSamplingRecords.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.productionOrderSamplingRecords.update.mockResolvedValue(
      updatedSamplingRecord,
    );

    await expect(
      service.update(1, {
        sampling_type: 'Dot xuat',
        quantity: 3.25,
      }),
    ).resolves.toBe(updatedSamplingRecord);
    expect(
      prismaService.productionOrderSamplingRecords.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
        data: expect.objectContaining({
          sampling_type: 'Dot xuat',
        }),
      }),
    );
    expect(
      prismaService.productionOrderSamplingRecords.update.mock.calls[0][0].data
        .quantity.toString(),
    ).toBe('3.25');
  });

  it('deletes a sampling record', async () => {
    const deletedSamplingRecord = { id: 1 };
    prismaService.productionOrderSamplingRecords.findUnique.mockResolvedValue({
      id: 1,
    });
    prismaService.productionOrderSamplingRecords.delete.mockResolvedValue(
      deletedSamplingRecord,
    );

    await expect(service.delete(1)).resolves.toBe(deletedSamplingRecord);
    expect(
      prismaService.productionOrderSamplingRecords.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws BadRequestException when quantity is not positive', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          sampling_type: 'Dinh ky',
          quantity: 0,
          unit: 'mau',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when update has no fields', async () => {
    prismaService.productionOrderSamplingRecords.findUnique.mockResolvedValue({
      id: 1,
    });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        sampling_type: 'Dinh ky',
        quantity: 1,
        unit: 'mau',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
