import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';

describe('ProductionOrderFinishedProductSummariesService', () => {
  let service: ProductionOrderFinishedProductSummariesService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderFinishedProductSummaries: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderFinishedProductSummaries: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderFinishedProductSummariesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderFinishedProductSummariesService>(
      ProductionOrderFinishedProductSummariesService,
    );
  });

  it('gets finished product summaries for a production order', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.findMany.mockResolvedValue(
      summaries,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      summaries,
    );
    expect(
      prismaService.productionOrderFinishedProductSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
      }),
    );
  });

  it('creates a finished product summary with normalized input', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    const result = await service.create(
      2031,
      {
        package_count: ' 12 ',
        boxes_per_package: '024',
        loose_box_count: 3,
      },
      { id: 7 },
    );

    expect(result).toBe(createdSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          package_count: 12,
          boxes_per_package: 24,
          loose_box_count: 3,
          created_by_id: 7,
        },
      }),
    );
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows creating multiple finished product summaries for a production order', async () => {
    const createdSummary = { id: 2, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFinishedProductSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await expect(
      service.create(
        2031,
        {
          package_count: 12,
          boxes_per_package: 24,
          loose_box_count: 3,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdSummary);
    expect(
      prismaService.productionOrderFinishedProductSummaries.create,
    ).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when a count is not an integer', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          package_count: 12.5,
          boxes_per_package: 24,
          loose_box_count: 3,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, {
        package_count: 12,
        boxes_per_package: 24,
        loose_box_count: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
