import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import type { Response } from 'express';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  let productionOrdersService: {
    findAll: jest.Mock;
    findProductionOrderById: jest.Mock;
    findProductionOrderLines: jest.Mock;
    exportProductionOrderLines: jest.Mock;
  };

  beforeEach(async () => {
    productionOrdersService = {
      findAll: jest.fn(),
      findProductionOrderById: jest.fn(),
      findProductionOrderLines: jest.fn(),
      exportProductionOrderLines: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionOrdersController],
      providers: [
        {
          provide: ProductionOrdersService,
          useValue: productionOrdersService,
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

    const result = await controller.exportProductionOrderLines(2031, response);

    expect(
      productionOrdersService.exportProductionOrderLines,
    ).toHaveBeenCalledWith(2031);
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="warehouse-release-order-2031.xlsx"; filename*=UTF-8\'\'warehouse-release-order-2031.xlsx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
