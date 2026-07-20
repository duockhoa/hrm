import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';

describe('ProductionOrderEnvironmentChecksService', () => {
  let service: ProductionOrderEnvironmentChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderEnvironmentChecks: {
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
      productionOrderEnvironmentChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderEnvironmentChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderEnvironmentChecksService>(
      ProductionOrderEnvironmentChecksService,
    );
  });

  it('gets environment checks for a production order', async () => {
    const environmentChecks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderEnvironmentChecks.findMany.mockResolvedValue(
      environmentChecks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      environmentChecks,
    );
    expect(
      prismaService.productionOrderEnvironmentChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('gets an environment check by id', async () => {
    const environmentCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue(
      environmentCheck,
    );

    await expect(service.findById(1)).resolves.toBe(environmentCheck);
    expect(
      prismaService.productionOrderEnvironmentChecks.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
        },
      }),
    );
  });

  it('throws NotFoundException when the environment check does not exist', async () => {
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an environment check with normalized input', async () => {
    const createdEnvironmentCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderEnvironmentChecks.create.mockResolvedValue(
      createdEnvironmentCheck,
    );

    const result = await service.create(
      2031,
      {
        room: ' Phong pha che 1 ',
        temperature_c: '25,5',
        humidity_percent: 60.2,
        checked_at: '2026-06-11T08:00:00.000Z',
      },
      { id: 7 },
    );

    expect(result).toBe(createdEnvironmentCheck);
    const createArg =
      prismaService.productionOrderEnvironmentChecks.create.mock.calls[0][0];
    expect(createArg.data).toEqual(
      expect.objectContaining({
        production_order_id: 2031,
        room: 'Phong pha che 1',
        created_by_id: 7,
        checked_at: new Date('2026-06-11T08:00:00.000Z'),
      }),
    );
    expect(createArg.data.temperature_c.toString()).toBe('25.5');
    expect(createArg.data.humidity_percent.toString()).toBe('60.2');
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when humidity is greater than 100', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          room: 'Phong pha che 1',
          temperature_c: 25.5,
          humidity_percent: 101,
          checked_at: '2026-06-11T08:00:00.000Z',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates an environment check with normalized input', async () => {
    const updatedEnvironmentCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });
    prismaService.productionOrderEnvironmentChecks.update.mockResolvedValue(
      updatedEnvironmentCheck,
    );

    await expect(
      service.update(1, {
        room: ' Phong dong goi 1 ',
        temperature_c: '26,25',
        humidity_percent: '58.5',
        checked_at: '2026-06-12T08:00:00.000Z',
      }),
    ).resolves.toBe(updatedEnvironmentCheck);

    const updateArg =
      prismaService.productionOrderEnvironmentChecks.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 1 });
    expect(updateArg.data).toEqual(
      expect.objectContaining({
        room: 'Phong dong goi 1',
        checked_at: new Date('2026-06-12T08:00:00.000Z'),
      }),
    );
    expect(updateArg.data.temperature_c.toString()).toBe('26.25');
    expect(updateArg.data.humidity_percent.toString()).toBe('58.5');
  });

  it('rejects an environment check update without any supported fields', async () => {
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('throws BadRequestException when updated humidity is greater than 100', async () => {
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });

    await expect(
      service.update(1, {
        humidity_percent: 101,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when updating a missing environment check', async () => {
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, {
        humidity_percent: 58.5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes an existing environment check', async () => {
    const deletedEnvironmentCheck = { id: 1 };
    prismaService.productionOrderEnvironmentChecks.findUnique.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });
    prismaService.productionOrderEnvironmentChecks.delete.mockResolvedValue(
      deletedEnvironmentCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedEnvironmentCheck);
    expect(
      prismaService.productionOrderEnvironmentChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        room: 'Phong pha che 1',
        temperature_c: 25.5,
        humidity_percent: 60.2,
        checked_at: '2026-06-11T08:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
