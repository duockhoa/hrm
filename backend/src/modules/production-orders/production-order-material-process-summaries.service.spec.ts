import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderMaterialProcessSummariesService } from './production-order-material-process-summaries.service';

describe('ProductionOrderMaterialProcessSummariesService', () => {
  let service: ProductionOrderMaterialProcessSummariesService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderMaterialProcessSummaries: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderMaterialProcessSummaries: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderMaterialProcessSummariesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderMaterialProcessSummariesService);
  });

  it('lists summaries for a production order from newest to oldest', async () => {
    const summaries = [{ id: 2 }, { id: 1 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderMaterialProcessSummaries.findMany.mockResolvedValue(
      summaries,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      summaries,
    );
    expect(
      prismaService.productionOrderMaterialProcessSummaries.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { production_order_id: 2031 },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('creates a summary with normalized quantitative values and image path', async () => {
    const summary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderMaterialProcessSummaries.create.mockResolvedValue(
      summary,
    );

    await expect(
      service.create(
        2031,
        {
          process_stage: ' Sấy ',
          yielded_quantity: '12,500',
          moisture_percent: '4,25',
          note: ' Đạt yêu cầu ',
        },
        { id: '7' },
        {
          imagePath:
            '/production-orders/material-process-summaries/images/a.jpg',
        },
      ),
    ).resolves.toBe(summary);

    expect(
      prismaService.productionOrderMaterialProcessSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2031,
          process_stage: 'Sấy',
          yielded_unit: 'kg',
          image_path:
            '/production-orders/material-process-summaries/images/a.jpg',
          created_by_id: 7,
        }),
      }),
    );
  });

  it('rejects a moisture value above 100 percent', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          process_stage: 'Sấy',
          yielded_quantity: 12,
          moisture_percent: '100.01',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an authenticated user when creating a summary', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { process_stage: 'Sấy', yielded_quantity: 12 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(service.findAllByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
