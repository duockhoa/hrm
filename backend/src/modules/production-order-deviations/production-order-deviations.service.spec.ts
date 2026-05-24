import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

describe('ProductionOrderDeviationsService', () => {
  let service: ProductionOrderDeviationsService;
  let prismaService: {
    productionOrderDeviations: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productionOrders: {
      findUnique: jest.Mock;
    };
    users: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrderDeviations: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productionOrders: {
        findUnique: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderDeviationsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderDeviationsService>(
      ProductionOrderDeviationsService,
    );
  });

  it('creates a production order deviation with normalized data', async () => {
    const createdDeviation = {
      id: 1,
      production_order_id: 2031,
      deviation_content: 'Sai lech khoi luong',
      deviation_image: null,
      handling_plan: 'Kiem tra lai cong doan',
      approver_id: null,
      reporter_id: 7,
    };

    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.users.findFirst.mockResolvedValue({ id: 7 });
    prismaService.productionOrderDeviations.create.mockResolvedValue(
      createdDeviation,
    );

    await expect(
      service.create({
        production_order_id: '2031',
        deviation_content: '  Sai lech khoi luong  ',
        deviation_image: '',
        handling_plan: '  Kiem tra lai cong doan  ',
        reporter_id: '7',
      }),
    ).resolves.toEqual(createdDeviation);

    expect(prismaService.productionOrderDeviations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          deviation_content: 'Sai lech khoi luong',
          deviation_image: null,
          handling_plan: 'Kiem tra lai cong doan',
          approver_id: null,
          reporter_id: 7,
        },
      }),
    );
  });

  it('rejects empty updates', async () => {
    prismaService.productionOrderDeviations.findFirst.mockResolvedValue({
      id: 1,
    });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      prismaService.productionOrderDeviations.update,
    ).not.toHaveBeenCalled();
  });
});
