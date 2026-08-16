import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderSecondaryPackagingChecksService } from './production-order-secondary-packaging-checks.service';

describe('ProductionOrderSecondaryPackagingChecksService', () => {
  let service: ProductionOrderSecondaryPackagingChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderSecondaryPackagingChecks: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      productionOrders: { findUnique: jest.fn() },
      productionOrderSecondaryPackagingChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderSecondaryPackagingChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderSecondaryPackagingChecksService);
  });

  it('creates a secondary packaging check with the logged-in inspector', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSecondaryPackagingChecks.create.mockResolvedValue(
      {
        id: 1,
      },
    );

    await service.create(
      2031,
      {
        stage: ' Đóng hộp ',
        requirement: ' Nhãn và số lô đúng quy định ',
        quantity_checked: '100',
        quantity_passed: '98',
      },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderSecondaryPackagingChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2031,
          stage: 'Đóng hộp',
          requirement: 'Nhãn và số lô đúng quy định',
          quantity_checked: 100,
          quantity_passed: 98,
          checked_by_id: 7,
        }),
      }),
    );
  });

  it('rejects a passed quantity greater than the checked quantity', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'Đóng hộp',
          requirement: 'Đúng quy định',
          quantity_checked: 99,
          quantity_passed: 100,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-integer checked quantity', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          stage: 'Đóng hộp',
          requirement: 'Đúng quy định',
          quantity_checked: 10.5,
          quantity_passed: 10,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updates that would make passed quantity exceed checked quantity', async () => {
    prismaService.productionOrderSecondaryPackagingChecks.findUnique.mockResolvedValue(
      {
        id: 1,
        production_order_id: 2031,
        quantity_checked: 100,
        quantity_passed: 90,
      },
    );

    await expect(
      service.update(1, { quantity_checked: 80 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderSecondaryPackagingChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderSecondaryPackagingChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { production_order_id: 2031 } }),
    );
  });
});
