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
      update: jest.Mock;
      delete: jest.Mock;
    };
    productionOrderSensoryCheckImages: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
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
        update: jest.fn(),
        delete: jest.fn(),
      },
      productionOrderSensoryCheckImages: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
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

  it('creates a sensory check with normalized text and image paths', async () => {
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
          imagePaths: [
            '/production-orders/sensory-checks/images/test-1.jpg',
            '/production-orders/sensory-checks/images/test-2.jpg',
          ],
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
          created_by_id: 7,
          images: {
            create: [
              {
                image_path:
                  '/production-orders/sensory-checks/images/test-1.jpg',
                created_by_id: 7,
              },
              {
                image_path:
                  '/production-orders/sensory-checks/images/test-2.jpg',
                created_by_id: 7,
              },
            ],
          },
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

  it('updates a sensory check with normalized text', async () => {
    const updatedCheck = { id: 1, color: 'vang dam' };
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: 'vang nhat',
      smell: null,
      taste: null,
      note: null,
      images: [],
    });
    prismaService.productionOrderSensoryChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        color: ' vang dam ',
        note: ' dat ',
      }),
    ).resolves.toBe(updatedCheck);
    expect(
      prismaService.productionOrderSensoryChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          color: 'vang dam',
          note: 'dat',
        },
      }),
    );
  });

  it('rejects an empty sensory check update', async () => {
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: 'vang nhat',
      smell: null,
      taste: null,
      note: null,
      images: [],
    });

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
    expect(
      prismaService.productionOrderSensoryChecks.update,
    ).not.toHaveBeenCalled();
  });

  it('rejects clearing the last sensory check value', async () => {
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: 'vang nhat',
      smell: null,
      taste: null,
      note: null,
      images: [],
    });

    await expect(service.update(1, { color: '' })).rejects.toThrow(
      'At least one sensory check value is required',
    );
    expect(
      prismaService.productionOrderSensoryChecks.update,
    ).not.toHaveBeenCalled();
  });

  it('deletes an existing sensory check', async () => {
    const deletedCheck = { id: 1 };
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: null,
      smell: null,
      taste: null,
      note: null,
      images: [
        { image_path: '/production-orders/sensory-checks/images/old.jpg' },
      ],
    });
    prismaService.productionOrderSensoryChecks.delete.mockResolvedValue(
      deletedCheck,
    );

    await expect(service.delete(1)).resolves.toBe(deletedCheck);
    expect(
      prismaService.productionOrderSensoryChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
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

  it('adds images to an existing sensory check', async () => {
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: 'vang nhat',
      smell: null,
      taste: null,
      note: null,
      images: [],
    });
    prismaService.productionOrderSensoryCheckImages.createMany.mockResolvedValue(
      { count: 2 },
    );
    prismaService.productionOrderSensoryChecks.findUnique
      .mockResolvedValueOnce({
        id: 1,
        color: 'vang nhat',
        smell: null,
        taste: null,
        note: null,
        images: [],
      })
      .mockResolvedValueOnce({ id: 1, images: [] });

    await service.addImages(
      1,
      [
        '/production-orders/sensory-checks/images/test-1.jpg',
        '/production-orders/sensory-checks/images/test-2.jpg',
      ],
      { id: 7 },
    );

    expect(
      prismaService.productionOrderSensoryCheckImages.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          sensory_check_id: 1,
          image_path: '/production-orders/sensory-checks/images/test-1.jpg',
          created_by_id: 7,
        },
        {
          sensory_check_id: 1,
          image_path: '/production-orders/sensory-checks/images/test-2.jpg',
          created_by_id: 7,
        },
      ],
    });
  });

  it('rejects adding images above the limit for a sensory check', async () => {
    prismaService.productionOrderSensoryChecks.findUnique.mockResolvedValue({
      id: 1,
      color: 'vang nhat',
      smell: null,
      taste: null,
      note: null,
      images: Array.from({ length: 10 }, () => ({ image_path: 'old.jpg' })),
    });

    await expect(
      service.addImages(
        1,
        ['/production-orders/sensory-checks/images/new.jpg'],
        {
          id: 7,
        },
      ),
    ).rejects.toThrow('images cannot exceed 10 files per sensory check');
  });

  it('does not remove the final image from an otherwise empty sensory check', async () => {
    prismaService.productionOrderSensoryCheckImages.findUnique.mockResolvedValue(
      {
        id: 1,
        image_path: '/production-orders/sensory-checks/images/only.jpg',
        sensoryCheck: {
          color: null,
          smell: null,
          taste: null,
          note: null,
          images: [
            {
              image_path: '/production-orders/sensory-checks/images/only.jpg',
            },
          ],
        },
      },
    );

    await expect(service.deleteImage(1)).rejects.toThrow(
      'At least one sensory check value is required',
    );
    expect(
      prismaService.productionOrderSensoryCheckImages.delete,
    ).not.toHaveBeenCalled();
  });
});
