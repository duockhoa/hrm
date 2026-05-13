import { Test, TestingModule } from '@nestjs/testing';
import { ProductionOrdersService } from './production-orders.service';
import { PrismaService } from 'src/prisma.service';

describe('ProductionOrdersService', () => {
  let service: ProductionOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrdersService,
        {
          provide: PrismaService,
          useValue: {
            productionOrders: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductionOrdersService>(ProductionOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
