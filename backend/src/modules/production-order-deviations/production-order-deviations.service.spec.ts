import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

describe('ProductionOrderDeviationsService', () => {
  let service: ProductionOrderDeviationsService;
  let prismaService: {
    $transaction: jest.Mock;
    productionOrderDeviations: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productionOrderDeviationImages: {
      findFirst: jest.Mock;
      createMany: jest.Mock;
      updateMany: jest.Mock;
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
      $transaction: jest.fn((callback) => callback(prismaService)),
      productionOrderDeviations: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productionOrderDeviationImages: {
        findFirst: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
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
      images: [
        {
          image_path: '/production-order-deviations/images/image-1.jpg',
        },
        {
          image_path: '/production-order-deviations/images/image-2.jpg',
        },
      ],
      handling_plan: 'Kiem tra lai cong doan',
      handling_result: 'Da cach ly lo anh huong',
      cause: 'Sai thong so may',
      cause_classification: 'Thiet bi',
      affected_quantity: new Prisma.Decimal('12.5'),
      affected_quantity_unit: 'kg',
      approver_id: null,
      reporter_id: 7,
    };

    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.users.findFirst.mockResolvedValue({ id: 7 });
    prismaService.productionOrderDeviations.create.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });
    prismaService.productionOrderDeviations.findFirst.mockResolvedValue(
      createdDeviation,
    );

    await expect(
      service.create({
        production_order_id: '2031',
        deviation_content: '  Sai lech khoi luong  ',
        deviation_images: [
          '/production-order-deviations/images/image-1.jpg',
          '/production-order-deviations/images/image-2.jpg',
        ],
        handling_plan: '  Kiem tra lai cong doan  ',
        handling_result: '  Da cach ly lo anh huong  ',
        cause: '  Sai thong so may  ',
        cause_classification: '  Thiet bi  ',
        affected_quantity: '12,5',
        affected_quantity_unit: '  kg  ',
        reporter_id: '7',
      }),
    ).resolves.toEqual({
      ...createdDeviation,
      deviation_images: [
        '/production-order-deviations/images/image-1.jpg',
        '/production-order-deviations/images/image-2.jpg',
      ],
      deviation_image: '/production-order-deviations/images/image-1.jpg',
    });

    expect(prismaService.productionOrderDeviations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          deviation_content: 'Sai lech khoi luong',
          handling_plan: 'Kiem tra lai cong doan',
          handling_result: 'Da cach ly lo anh huong',
          cause: 'Sai thong so may',
          cause_classification: 'Thiet bi',
          affected_quantity: new Prisma.Decimal('12.5'),
          affected_quantity_unit: 'kg',
          approver_id: null,
          reporter_id: 7,
        },
      }),
    );
    expect(
      prismaService.productionOrderDeviationImages.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          deviation_id: 1,
          image_path: '/production-order-deviations/images/image-1.jpg',
        },
        {
          deviation_id: 1,
          image_path: '/production-order-deviations/images/image-2.jpg',
        },
      ],
    });
  });

  it('rejects empty updates', async () => {
    prismaService.productionOrderDeviations.findFirst.mockResolvedValue({
      id: 1,
      images: [],
    });

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });
});
