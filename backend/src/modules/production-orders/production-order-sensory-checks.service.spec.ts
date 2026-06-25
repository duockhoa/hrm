import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';

describe('ProductionOrderSensoryChecksService', () => {
  let service: ProductionOrderSensoryChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderSensoryChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderSensoryChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSensoryChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderSensoryChecksService>(
      ProductionOrderSensoryChecksService,
    );
  });

  it('gets sensory checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSensoryChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderSensoryChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a sensory check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a sensory check does not exist', async () => {
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a sensory check with normalized text and image path', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSensoryChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          color: ' vang nhat ',
          smell: ' thom ',
          taste: ' ngot ',
          note: ' dat yeu cau ',
        },
        { id: '7' },
        {
          imagePath: '/production-orders/sensory-checks/images/test.jpg',
        },
      ),
    ).resolves.toBe(createdCheck);

    expect(
      prismaService.productionOrderSensoryChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          color: 'vang nhat',
          smell: 'thom',
          taste: 'ngot',
          note: 'dat yeu cau',
          image_path: '/production-orders/sensory-checks/images/test.jpg',
          created_by_id: 7,
        },
      }),
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        2031,
        {
          color: 'vang nhat',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an empty sensory check', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, {}, { id: 7 })).rejects.toThrow(
      'At least one sensory check value is required',
    );
    expect(
      prismaService.productionOrderSensoryChecks.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects a text value longer than 255 characters', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          color: 'A'.repeat(256),
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        color: 'vang nhat',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
