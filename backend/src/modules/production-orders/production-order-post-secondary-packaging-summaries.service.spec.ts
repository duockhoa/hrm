import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderPostSecondaryPackagingSummariesService } from './production-order-post-secondary-packaging-summaries.service';

describe('ProductionOrderPostSecondaryPackagingSummariesService', () => {
  let service: ProductionOrderPostSecondaryPackagingSummariesService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderPostSecondaryPackagingSummaries: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderPostSecondaryPackagingSummaries: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderPostSecondaryPackagingSummariesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderPostSecondaryPackagingSummariesService>(
      ProductionOrderPostSecondaryPackagingSummariesService,
    );
  });

  it('stores a normalized unit when creating a summary', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderPostSecondaryPackagingSummaries.create.mockResolvedValue(
      { id: 1, unit: 'kg' },
    );

    await expect(
      service.create(
        2031,
        {
          semi_finished_product_order_id: 2030,
          received_bag_count: 12,
          remaining_quantity: '3.5',
          unit: ' kg ',
        },
        { id: 7 },
      ),
    ).resolves.toEqual({ id: 1, unit: 'kg' });

    expect(
      prismaService.productionOrderPostSecondaryPackagingSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit: 'kg',
        }),
      }),
    );
  });

  it('updates and clears the unit', async () => {
    prismaService.productionOrderPostSecondaryPackagingSummaries.findUnique.mockResolvedValue(
      { id: 1, production_order_id: 2031 },
    );
    prismaService.productionOrderPostSecondaryPackagingSummaries.update.mockResolvedValue(
      { id: 1, unit: null },
    );

    await expect(service.update(1, { unit: '' })).resolves.toEqual({
      id: 1,
      unit: null,
    });
    expect(
      prismaService.productionOrderPostSecondaryPackagingSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unit: null },
      }),
    );
  });
});
