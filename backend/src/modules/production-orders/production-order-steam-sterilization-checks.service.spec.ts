import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSteamSterilizationChecksService } from './production-order-steam-sterilization-checks.service';

describe('ProductionOrderSteamSterilizationChecksService', () => {
  let service: ProductionOrderSteamSterilizationChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    users: {
      findUnique: jest.Mock;
    };
    productionOrderSteamSterilizationChecks: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    equipment_name: ' Noi hap 1 ',
    setting_temperature: '121,50',
    setting_time: '30',
    checked_by_id: 8,
    checked_at: '2026-07-06T08:00:00.000Z',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      users: {
        findUnique: jest.fn(),
      },
      productionOrderSteamSterilizationChecks: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSteamSterilizationChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderSteamSterilizationChecksService>(
      ProductionOrderSteamSterilizationChecksService,
    );
  });

  it('gets steam sterilization checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSteamSterilizationChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderSteamSterilizationChecks.findMany,
    ).toHaveBeenCalledWith({
      where: {
        production_order_id: 2031,
      },
      include: expect.any(Object),
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('gets a steam sterilization check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSteamSterilizationChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
    expect(
      prismaService.productionOrderSteamSterilizationChecks.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      include: expect.any(Object),
    });
  });

  it('creates a steam sterilization check using the authenticated user', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.users.findUnique.mockResolvedValue({ id: 8 });
    prismaService.productionOrderSteamSterilizationChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        validDto,
        { id: 7 },
        {
          configurationImagePath:
            '/production-orders/steam-sterilization-checks/images/config.jpg',
        },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderSteamSterilizationChecks.create,
    ).toHaveBeenCalledWith({
      data: {
        production_order_id: 2031,
        equipment_name: 'Noi hap 1',
        setting_temperature: new Prisma.Decimal('121.50'),
        setting_time: 30,
        configuration_image_path:
          '/production-orders/steam-sterilization-checks/images/config.jpg',
        indicator_image_path: null,
        reached_temperature_image_path: null,
        created_by_id: 7,
        checked_by_id: 8,
        checked_at: new Date('2026-07-06T08:00:00.000Z'),
      },
      include: expect.any(Object),
    });
  });

  it('creates a steam sterilization check without optional information', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSteamSterilizationChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, {}, { id: 7 })).resolves.toBe(
      createdCheck,
    );
    expect(
      prismaService.productionOrderSteamSterilizationChecks.create,
    ).toHaveBeenCalledWith({
      data: {
        production_order_id: 2031,
        equipment_name: null,
        setting_temperature: null,
        setting_time: null,
        configuration_image_path: null,
        indicator_image_path: null,
        reached_temperature_image_path: null,
        created_by_id: 7,
        checked_by_id: null,
        checked_at: null,
      },
      include: expect.any(Object),
    });
  });

  it('throws NotFoundException when checker does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.users.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, { checked_by_id: 8 }, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates provided fields', async () => {
    const existingCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSteamSterilizationChecks.findUnique.mockResolvedValue(
      existingCheck,
    );
    prismaService.productionOrderSteamSterilizationChecks.update.mockResolvedValue(
      {
        ...existingCheck,
        setting_temperature: '122.00',
      },
    );

    await service.update(1, {
      equipment_name: 'Noi hap 2',
      setting_temperature: '122',
      setting_time: null,
    });

    expect(
      prismaService.productionOrderSteamSterilizationChecks.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        equipment_name: 'Noi hap 2',
        setting_temperature: new Prisma.Decimal('122'),
        setting_time: null,
      },
      include: expect.any(Object),
    });
  });

  it('rejects an update without fields', async () => {
    prismaService.productionOrderSteamSterilizationChecks.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes a steam sterilization check', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSteamSterilizationChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.delete(1)).resolves.toBe(check);
    expect(
      prismaService.productionOrderSteamSterilizationChecks.delete,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
    });
  });
});
