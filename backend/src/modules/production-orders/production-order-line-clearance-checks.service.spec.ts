import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderLineClearanceChecksService } from './production-order-line-clearance-checks.service';

describe('ProductionOrderLineClearanceChecksService', () => {
  let service: ProductionOrderLineClearanceChecksService;
  let prismaService: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderLineClearanceChecks: {
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
      productionOrderLineClearanceChecks: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionOrderLineClearanceChecksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get(ProductionOrderLineClearanceChecksService);
  });

  it('creates a check, copies the previous order lot, and normalizes its result', async () => {
    prismaService.productionOrders.findUnique
      .mockResolvedValueOnce({ id: 2031 })
      .mockResolvedValueOnce({ id: 2001, lot_no: 'LO-TRUOC-01' });
    prismaService.productionOrderLineClearanceChecks.create.mockResolvedValue({
      id: 1,
    });

    await service.create(
      2031,
      {
        check_type: ' Bao bì ',
        requirement: ' Không còn nhãn hoặc vật tư lô trước ',
        result: ' dat ',
        previous_production_order_id: 2001,
      },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderLineClearanceChecks.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          production_order_id: 2031,
          check_type: 'Bao bì',
          requirement: 'Không còn nhãn hoặc vật tư lô trước',
          result: 'Đạt',
          previous_production_order_id: 2001,
          previous_lot_no: 'LO-TRUOC-01',
          created_by_id: 7,
        }),
      }),
    );
  });

  it('accepts a manually entered previous lot when no previous order is selected', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValueOnce({
      id: 2031,
    });
    prismaService.productionOrderLineClearanceChecks.create.mockResolvedValue({
      id: 1,
    });

    await service.create(
      2031,
      {
        check_type: 'Thiết bị',
        requirement: 'Đã làm sạch',
        result: 'Không đạt',
        previous_lot_no: ' LO-TRUOC-02 ',
      },
      { id: 7 },
    );

    expect(
      prismaService.productionOrderLineClearanceChecks.create.mock.calls[0][0]
        .data,
    ).toMatchObject({
      previous_production_order_id: undefined,
      previous_lot_no: 'LO-TRUOC-02',
      result: 'Không đạt',
    });
  });

  it('rejects results other than Đạt or Không đạt', async () => {
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });

    await expect(
      service.create(
        2031,
        {
          check_type: 'Thiết bị',
          requirement: 'Đã làm sạch',
          result: 'Chờ kiểm tra',
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when the selected previous order does not exist', async () => {
    prismaService.productionOrders.findUnique
      .mockResolvedValueOnce({ id: 2031 })
      .mockResolvedValueOnce(null);

    await expect(
      service.create(
        2031,
        {
          check_type: 'Thiết bị',
          requirement: 'Đã làm sạch',
          result: 'Đạt',
          previous_production_order_id: 2001,
        },
        { id: 7 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    prismaService.productionOrders.findUnique.mockResolvedValue({ id: 2031 });
    prismaService.productionOrderLineClearanceChecks.findMany.mockResolvedValue(
      checks,
    );

    await expect(service.findAllByProductionOrder(2031)).resolves.toBe(checks);
    expect(
      prismaService.productionOrderLineClearanceChecks.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { production_order_id: 2031 } }),
    );
  });
});
