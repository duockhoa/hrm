import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDisinfectantPreparationsService } from './production-order-disinfectant-preparations.service';

describe('ProductionOrderDisinfectantPreparationsService', () => {
  let service: ProductionOrderDisinfectantPreparationsService;
  let prismaService: {
    productionOrders: {
      findUnique: jest.Mock;
    };
    productionWorkshops: {
      findUnique: jest.Mock;
    };
    productionOrderDisinfectantPreparations: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const validDto = {
    workshop_id: 2,
    disinfectant_name: ' Con 70 ',
    purpose: ' Sat khuan dung cu ',
    base_material_name: ' Con 96 ',
    base_material_content: '96,0000',
    base_material_amount_l: '7,3000',
    prepared_volume_l: 10,
    actual_concentration: 70,
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: {
        findUnique: jest.fn(),
      },
      productionWorkshops: {
        findUnique: jest.fn(),
      },
      productionOrderDisinfectantPreparations: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderDisinfectantPreparationsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ProductionOrderDisinfectantPreparationsService>(
      ProductionOrderDisinfectantPreparationsService,
    );
  });

  it('gets disinfectant preparations for a production order', async () => {
    const preparations = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderDisinfectantPreparations.findMany.mockResolvedValue(
      preparations,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(
      preparations,
    );
    expect(
      prismaService.productionOrderDisinfectantPreparations.findMany,
    ).toHaveBeenCalledWith({
      where: {
        production_order_id: 2031,
      },
      include: expect.any(Object),
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('gets a disinfectant preparation by id', async () => {
    const preparation = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderDisinfectantPreparations.findUnique.mockResolvedValue(
      preparation,
    );

    await expect(service.findById(1)).resolves.toBe(preparation);
    expect(
      prismaService.productionOrderDisinfectantPreparations.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      include: expect.any(Object),
    });
  });

  it('creates a disinfectant preparation using the authenticated user', async () => {
    const createdPreparation = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionWorkshops.findUnique.mockResolvedValue({ id: 2 });
    prismaService.productionOrderDisinfectantPreparations.create.mockResolvedValue(
      createdPreparation,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdPreparation,
    );
    expect(
      prismaService.productionOrderDisinfectantPreparations.create,
    ).toHaveBeenCalledWith({
      data: {
        production_order_id: 2031,
        workshop_id: 2,
        disinfectant_name: 'Con 70',
        purpose: 'Sat khuan dung cu',
        base_material_name: 'Con 96',
        base_material_content: new Prisma.Decimal('96.0000'),
        base_material_amount_l: new Prisma.Decimal('7.3000'),
        prepared_volume_l: new Prisma.Decimal('10'),
        actual_concentration: new Prisma.Decimal('70'),
        created_by_id: 7,
      },
      include: expect.any(Object),
    });
  });

  it('throws NotFoundException when the workshop does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionWorkshops.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates provided fields', async () => {
    const preparation = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderDisinfectantPreparations.findUnique.mockResolvedValue(
      preparation,
    );
    prismaService.productionOrderDisinfectantPreparations.update.mockResolvedValue(
      {
        ...preparation,
        actual_concentration: '71.0000',
      },
    );

    await service.update(1, {
      disinfectant_name: 'Con 71',
      actual_concentration: '71',
    });

    expect(
      prismaService.productionOrderDisinfectantPreparations.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        disinfectant_name: 'Con 71',
        actual_concentration: new Prisma.Decimal('71'),
      },
      include: expect.any(Object),
    });
  });

  it('rejects an update without fields', async () => {
    prismaService.productionOrderDisinfectantPreparations.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );

    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deletes a disinfectant preparation', async () => {
    const preparation = { id: 1, production_order_id: 2031 };
    prismaService.productionOrderDisinfectantPreparations.findUnique.mockResolvedValue(
      preparation,
    );

    await expect(service.delete(1)).resolves.toBe(preparation);
    expect(
      prismaService.productionOrderDisinfectantPreparations.delete,
    ).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
    });
  });
});
