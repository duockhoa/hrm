import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderFiltrationChecksService } from './production-order-filtration-checks.service';

describe('ProductionOrderFiltrationChecksService', () => {
  let service: ProductionOrderFiltrationChecksService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderFiltrationChecks: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderFiltrationChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderFiltrationChecksService);
  });

  it('includes the product name when listing filtration checks', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderFiltrationChecks.findMany.mockResolvedValue([]);

    await service.findAllByProductionOrder(2031);

    expect(
      prismaService.productionOrderFiltrationChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          productionOrder: {
            select: {
              id: true,
              item_code: true,
              item: { select: { item_name: true } },
            },
          },
        }),
      }),
    );
  });
});
