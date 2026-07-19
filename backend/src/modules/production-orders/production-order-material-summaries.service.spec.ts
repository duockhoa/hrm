import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderMaterialSummariesService } from './production-order-material-summaries.service';

describe('ProductionOrderMaterialSummariesService', () => {
  let service: ProductionOrderMaterialSummariesService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderMaterialSummaries: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    items: { findUnique: jest.Mock };
    users: { findUnique: jest.Mock };
  };

  const material = {
    item_code: 'NL00001',
    item_name: 'Nguyen lieu A',
    unit: 'kg',
  };

  const validDto = {
    material_code: 'NL00001',
    lot_no: 'LOT-001',
    received_quantity: '100,5',
    used_quantity: '90',
    supplier_waste_quantity: '1.25',
    production_waste_quantity: 2,
    remaining_quantity: '6',
    sample_quantity: '1.25',
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderMaterialSummaries: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      items: { findUnique: jest.fn() },
      users: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderMaterialSummariesService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ProductionOrderMaterialSummariesService>(
      ProductionOrderMaterialSummariesService,
    );
  });

  it('creates a material summary with item snapshot and authenticated user', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.items.findUnique.mockResolvedValue(material);
    prismaService.users.findUnique.mockResolvedValue({ id: 7 });
    prismaService.productionOrderMaterialSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await expect(service.create(2031, validDto, { id: 7 })).resolves.toBe(
      createdSummary,
    );

    expect(
      prismaService.productionOrderMaterialSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          production_order_id: 2031,
          material_code: 'NL00001',
          material_name: 'Nguyen lieu A',
          lot_no: 'LOT-001',
          unit: 'kg',
          received_quantity: new Prisma.Decimal('100.5'),
          used_quantity: new Prisma.Decimal('90'),
          supplier_waste_quantity: new Prisma.Decimal('1.25'),
          production_waste_quantity: new Prisma.Decimal('2'),
          remaining_quantity: new Prisma.Decimal('6'),
          sample_quantity: new Prisma.Decimal('1.25'),
          summarized_by_id: 7,
          created_by_id: 7,
        },
      }),
    );
  });

  it('uses provided summarized_by_id when creating', async () => {
    const createdSummary = { id: 1, production_order_id: 2031 };
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.items.findUnique.mockResolvedValue(material);
    prismaService.users.findUnique.mockResolvedValue({ id: 9 });
    prismaService.productionOrderMaterialSummaries.create.mockResolvedValue(
      createdSummary,
    );

    await service.create(
      2031,
      { ...validDto, summarized_by_id: '9' },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderMaterialSummaries.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summarized_by_id: 9,
          created_by_id: 7,
        }),
      }),
    );
  });

  it('updates material code and refreshes item snapshot', async () => {
    const updatedSummary = { id: 1, material_code: 'NL00002' };
    prismaService.productionOrderMaterialSummaries.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );
    prismaService.items.findUnique.mockResolvedValue({
      item_code: 'NL00002',
      item_name: 'Nguyen lieu B',
      unit: 'g',
    });
    prismaService.productionOrderMaterialSummaries.update.mockResolvedValue(
      updatedSummary,
    );

    await expect(service.update(1, { material_code: 'NL00002' })).resolves.toBe(
      updatedSummary,
    );

    expect(
      prismaService.productionOrderMaterialSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          material: {
            connect: {
              item_code: 'NL00002',
            },
          },
          material_name: 'Nguyen lieu B',
          unit: 'g',
        },
      }),
    );
  });

  it('clears summarized_by_id on update', async () => {
    prismaService.productionOrderMaterialSummaries.findUnique.mockResolvedValue(
      {
        id: 1,
      },
    );
    prismaService.productionOrderMaterialSummaries.update.mockResolvedValue({
      id: 1,
    });

    await service.update(1, { summarized_by_id: null });

    expect(
      prismaService.productionOrderMaterialSummaries.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          summarizedBy: {
            disconnect: true,
          },
        },
      }),
    );
  });

  it('rejects a quantity with more than three decimal places', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.items.findUnique.mockResolvedValue(material);
    prismaService.users.findUnique.mockResolvedValue({ id: 7 });

    await expect(
      service.create(
        2031,
        { ...validDto, received_quantity: '100.1234' },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when material item does not exist', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.items.findUnique.mockResolvedValue(null);

    await expect(
      service.create(2031, validDto, { id: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws UnauthorizedException when authenticated user is missing', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(service.create(2031, validDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
