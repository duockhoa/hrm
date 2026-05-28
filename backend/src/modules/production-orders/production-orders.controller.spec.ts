import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import type { Response } from 'express';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  let productionOrdersService: {
    findAll: jest.Mock;
    findFinishedProducts: jest.Mock;
    findSemiFinishedProducts: jest.Mock;
    findProductionOrderById: jest.Mock;
    findProductionOrderLines: jest.Mock;
    exportProductionOrderLines: jest.Mock;
  };
  let productionOrderSamplingRequestsService: {
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    productionOrdersService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findProductionOrderById: jest.fn(),
      findProductionOrderLines: jest.fn(),
      exportProductionOrderLines: jest.fn(),
    };
    productionOrderSamplingRequestsService = {
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        {
          provide: ProductionOrdersService,
          useValue: productionOrdersService,
        },
        {
          provide: ProductionOrderSamplingRequestsService,
          useValue: productionOrderSamplingRequestsService,
        },
      ],
    }).compile();

    controller = module.get<ProductionOrdersController>(
      ProductionOrdersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gets production orders with TP item codes', async () => {
    const productionOrders = [{ id: 2031, item_code: 'TP00001' }];
    productionOrdersService.findFinishedProducts.mockResolvedValue(
      productionOrders,
    );

    await expect(controller.findFinishedProducts()).resolves.toBe(
      productionOrders,
    );
    expect(productionOrdersService.findFinishedProducts).toHaveBeenCalledTimes(
      1,
    );
  });

  it('gets production orders with BTP item codes', async () => {
    const productionOrders = [{ id: 2031, item_code: 'BTP00001' }];
    productionOrdersService.findSemiFinishedProducts.mockResolvedValue(
      productionOrders,
    );

    await expect(controller.findSemiFinishedProducts()).resolves.toBe(
      productionOrders,
    );
    expect(
      productionOrdersService.findSemiFinishedProducts,
    ).toHaveBeenCalledTimes(1);
  });

  it('gets a production order by id', async () => {
    const productionOrder = {
      id: 2031,
      item_code: 'TP00001',
      pyclm: {
        isSent: true,
      },
    };
    productionOrdersService.findProductionOrderById.mockResolvedValue(
      productionOrder,
    );

    await expect(controller.findProductionOrderById(2031)).resolves.toBe(
      productionOrder,
    );
    expect(
      productionOrdersService.findProductionOrderById,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets sampling requests for a production order', async () => {
    const samplingRequests = [{ id: 1, production_order_id: 2031 }];
    productionOrderSamplingRequestsService.findAllByProductionOrder.mockResolvedValue(
      samplingRequests,
    );

    await expect(controller.findSamplingRequests(2031)).resolves.toBe(
      samplingRequests,
    );
    expect(
      productionOrderSamplingRequestsService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('creates a sampling request using the authenticated user', async () => {
    const createDto = { location: 'Kiem nghiem' };
    const user = { id: 7, name: 'Binh' };
    const result = { status: 'success', samplingRequest: { id: 1 } };
    productionOrderSamplingRequestsService.create.mockResolvedValue(result);

    await expect(
      controller.createSamplingRequest(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSamplingRequestsService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('sets download headers and returns a streamable file when exporting production order lines', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportProductionOrderLines.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'warehouse-release-order-2031.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const exportOptions = { stageIds: [2, 3] };

    const result = await controller.exportProductionOrderLines(
      2031,
      exportOptions,
      response,
    );

    expect(
      productionOrdersService.exportProductionOrderLines,
    ).toHaveBeenCalledWith(2031, exportOptions);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="warehouse-release-order-2031.xlsx"; filename*=UTF-8\'\'warehouse-release-order-2031.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('uses an ASCII fallback filename when the exported filename has Vietnamese characters', async () => {
    const buffer = Buffer.from('xlsx-content');
    productionOrdersService.exportProductionOrderLines.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'PXK Thành phẩm test 010126.xlsx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    await controller.exportProductionOrderLines(2031, {}, response);

    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="PXK Thanh pham test 010126.xlsx"; filename*=UTF-8\'\'PXK%20Th%C3%A0nh%20ph%E1%BA%A9m%20test%20010126.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });
});
