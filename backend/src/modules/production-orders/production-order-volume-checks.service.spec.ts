import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderVolumeChecksService } from './production-order-volume-checks.service';

describe('ProductionOrderVolumeChecksService', () => {
  let service: ProductionOrderVolumeChecksService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionOrderVolumeChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    productionOrderVolumeCheckImages: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    package_type: ' lo ',
    requirement: ' The tich phai dat yeu cau ',
    unit_1_volume: 10.01,
    unit_2_volume: '10,02',
    unit_3_volume: '9.98',
    unit_4_volume: 10,
    unit_5_volume: 10.03,
    unit_6_volume: 9.99,
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionOrderVolumeChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      productionOrderVolumeCheckImages: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderVolumeChecksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderVolumeChecksService>(
      ProductionOrderVolumeChecksService,
    );
  });

  it('gets volume checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVolumeChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderVolumeChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          production_order_id: 2031,
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('gets a volume check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue(
      check,
    );

    await expect(service.findById(1)).resolves.toBe(check);
  });

  it('throws NotFoundException when a volume check does not exist', async () => {
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a check with normalized package type and volumes', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVolumeChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdCheck,
    );

    expect(
      prismaService.productionOrderVolumeChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          package_type: 'lo',
          requirement: 'The tich phai dat yeu cau',
          dosage_form_stage: null,
          unit_1_volume: new Prisma.Decimal('10.01'),
          unit_2_volume: new Prisma.Decimal('10.02'),
          unit_3_volume: new Prisma.Decimal('9.98'),
          unit_4_volume: new Prisma.Decimal('10'),
          unit_5_volume: new Prisma.Decimal('10.03'),
          unit_6_volume: new Prisma.Decimal('9.99'),
          unit: 'ml',
          created_by_id: 7,
        },
      }),
    );
  });

  it('creates a check when only one volume is provided', async () => {
    const createdCheck = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVolumeChecks.create.mockResolvedValue(
      createdCheck,
    );

    await expect(
      service.create(
        2031,
        {
          unit_1_volume: 5.5,
        },
        { id: 7 },
      ),
    ).resolves.toBe(createdCheck);
    expect(
      prismaService.productionOrderVolumeChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          package_type: null,
          requirement: null,
          dosage_form_stage: null,
          unit_1_volume: new Prisma.Decimal('5.5'),
          unit_2_volume: null,
          unit_3_volume: null,
          unit_4_volume: null,
          unit_5_volume: null,
          unit_6_volume: null,
          unit: 'ml',
          created_by_id: 7,
        },
      }),
    );
  });

  it('updates a volume check with normalized partial data', async () => {
    const updatedCheck = { id: 1, package_type: 'goi' };
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue({
      id: 1,
      unit_1_volume: new Prisma.Decimal('10.01'),
      unit_2_volume: new Prisma.Decimal('10.02'),
      unit_3_volume: null,
      unit_4_volume: null,
      unit_5_volume: null,
      unit_6_volume: null,
    });
    prismaService.productionOrderVolumeChecks.update.mockResolvedValue(
      updatedCheck,
    );

    await expect(
      service.update(1, {
        package_type: '',
        requirement: '',
        unit_2_volume: null,
        unit_3_volume: '6,25',
      }),
    ).resolves.toBe(updatedCheck);

    expect(
      prismaService.productionOrderVolumeChecks.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          package_type: null,
          requirement: null,
          unit_2_volume: null,
          unit_3_volume: new Prisma.Decimal('6.25'),
        },
      }),
    );
  });

  it('rejects a check without unit 1 volume', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { package_type: 'lo' }, { id: 7 }),
    ).rejects.toThrow('unit_1_volume is required');
    expect(
      prismaService.productionOrderVolumeChecks.create,
    ).not.toHaveBeenCalled();
  });

  it('allows a missing package type', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderVolumeChecks.create.mockResolvedValue({
      id: 1,
      production_order_id: 2031,
    });

    await expect(
      service.create(2031, { ...validDto, package_type: '' }, { id: 7 }),
    ).resolves.toEqual({
      id: 1,
      production_order_id: 2031,
    });
    expect(
      prismaService.productionOrderVolumeChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          package_type: null,
        }),
      }),
    );
  });

  it('rejects a non-string requirement', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(2031, { ...validDto, requirement: 1 as any }, { id: 7 }),
    ).rejects.toThrow('requirement must be a string');
  });

  it('rejects an empty update payload', async () => {
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue({
      id: 1,
      unit_1_volume: new Prisma.Decimal('10.01'),
      unit_2_volume: null,
      unit_3_volume: null,
      unit_4_volume: null,
      unit_5_volume: null,
      unit_6_volume: null,
    });

    await expect(service.update(1, {})).rejects.toThrow(
      'At least one field is required',
    );
  });

  it('rejects an update that removes unit 1 volume', async () => {
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue({
      id: 1,
      unit_1_volume: new Prisma.Decimal('10.01'),
      unit_2_volume: null,
      unit_3_volume: null,
      unit_4_volume: null,
      unit_5_volume: null,
      unit_6_volume: null,
    });

    await expect(service.update(1, { unit_1_volume: null })).rejects.toThrow(
      'unit_1_volume is required',
    );
  });

  it('rejects a volume with more than two decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          ...validDto,
          unit_1_volume: '10.001',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a volume that is not greater than zero', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          ...validDto,
          unit_1_volume: 0,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the production order does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when updating a missing volume check', async () => {
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.update(1, { unit_1_volume: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a volume check and its images', async () => {
    const existingCheck = {
      id: 1,
      production_order_id: 2031,
      images: [],
    };
    prismaService.productionOrderVolumeChecks.findUnique.mockResolvedValue(
      existingCheck,
    );
    prismaService.productionOrderVolumeChecks.delete.mockResolvedValue(
      existingCheck,
    );

    await expect(service.delete(1)).resolves.toBe(existingCheck);
    expect(
      prismaService.productionOrderVolumeChecks.delete,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
      }),
    );
  });

  it('adds images to a volume check', async () => {
    const check = { id: 1, images: [] };
    const result = { id: 1, images: [{ id: 2 }] };
    prismaService.productionOrderVolumeChecks.findUnique
      .mockResolvedValueOnce(check)
      .mockResolvedValueOnce(result);

    await expect(
      service.addImages(1, ['/production-orders/volume-checks/images/a.jpg'], {
        id: 7,
      }),
    ).resolves.toBe(result);
    expect(
      prismaService.productionOrderVolumeCheckImages.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          volume_check_id: 1,
          image_path: '/production-orders/volume-checks/images/a.jpg',
          created_by_id: 7,
        },
      ],
    });
  });

  it('deletes a volume check image', async () => {
    const image = {
      id: 2,
      image_path: '/production-orders/volume-checks/images/a.jpg',
    };
    prismaService.productionOrderVolumeCheckImages.findUnique.mockResolvedValue(
      image,
    );

    await expect(service.deleteImage(2)).resolves.toBe(image);
    expect(
      prismaService.productionOrderVolumeCheckImages.delete,
    ).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it('throws UnauthorizedException when the authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
