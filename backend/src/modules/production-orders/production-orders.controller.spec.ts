import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import type { Response } from 'express';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { ProductionOrderBottleVolumeChecksService } from './production-order-bottle-volume-checks.service';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';

describe('ProductionOrdersController', () => {
  let controller: ProductionOrdersController;
  let productionOrdersService: {
    findAll: jest.Mock;
    findFinishedProducts: jest.Mock;
    findSemiFinishedProducts: jest.Mock;
    findProductionOrderById: jest.Mock;
    findProductionOrderLines: jest.Mock;
    exportProductionOrder: jest.Mock;
    exportProductionOrderLines: jest.Mock;
  };
  let productionOrderSamplingRequestsService: {
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderEnvironmentChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderFinishedProductSummariesService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderDensityChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderFriabilityChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderDisintegrationChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderHardCapsuleLeakageChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderBottleVolumeChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderShellWeightChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderTenShellWeightChecksService: {
    findById: jest.Mock;
    findByProductionOrder: jest.Mock;
    upsert: jest.Mock;
  };
  let productionOrderVialInspectionChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
  };
  let productionOrderCylinderCalibrationsService: {
    findByProductionOrder: jest.Mock;
    upsert: jest.Mock;
  };
  let productionOrderSensoryChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    findImageFile: jest.Mock;
  };
  let productionOrderDateChecksService: {
    findById: jest.Mock;
    findAllByProductionOrder: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    delete: jest.Mock;
    addImages: jest.Mock;
    deleteImage: jest.Mock;
    findImageFile: jest.Mock;
    findRequestFile: jest.Mock;
  };

  beforeEach(async () => {
    productionOrdersService = {
      findAll: jest.fn(),
      findFinishedProducts: jest.fn(),
      findSemiFinishedProducts: jest.fn(),
      findProductionOrderById: jest.fn(),
      findProductionOrderLines: jest.fn(),
      exportProductionOrder: jest.fn(),
      exportProductionOrderLines: jest.fn(),
    };
    productionOrderSamplingRequestsService = {
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderEnvironmentChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderFinishedProductSummariesService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderDensityChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderFriabilityChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderDisintegrationChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderHardCapsuleLeakageChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderBottleVolumeChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderShellWeightChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderTenShellWeightChecksService = {
      findById: jest.fn(),
      findByProductionOrder: jest.fn(),
      upsert: jest.fn(),
    };
    productionOrderVialInspectionChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
    };
    productionOrderCylinderCalibrationsService = {
      findByProductionOrder: jest.fn(),
      upsert: jest.fn(),
    };
    productionOrderSensoryChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      findImageFile: jest.fn(),
    };
    productionOrderDateChecksService = {
      findById: jest.fn(),
      findAllByProductionOrder: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      delete: jest.fn(),
      addImages: jest.fn(),
      deleteImage: jest.fn(),
      findImageFile: jest.fn(),
      findRequestFile: jest.fn(),
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
        {
          provide: ProductionOrderEnvironmentChecksService,
          useValue: productionOrderEnvironmentChecksService,
        },
        {
          provide: ProductionOrderFinishedProductSummariesService,
          useValue: productionOrderFinishedProductSummariesService,
        },
        {
          provide: ProductionOrderDensityChecksService,
          useValue: productionOrderDensityChecksService,
        },
        {
          provide: ProductionOrderFriabilityChecksService,
          useValue: productionOrderFriabilityChecksService,
        },
        {
          provide: ProductionOrderDisintegrationChecksService,
          useValue: productionOrderDisintegrationChecksService,
        },
        {
          provide: ProductionOrderHardCapsuleLeakageChecksService,
          useValue: productionOrderHardCapsuleLeakageChecksService,
        },
        {
          provide: ProductionOrderBottleVolumeChecksService,
          useValue: productionOrderBottleVolumeChecksService,
        },
        {
          provide: ProductionOrderShellWeightChecksService,
          useValue: productionOrderShellWeightChecksService,
        },
        {
          provide: ProductionOrderTenShellWeightChecksService,
          useValue: productionOrderTenShellWeightChecksService,
        },
        {
          provide: ProductionOrderVialInspectionChecksService,
          useValue: productionOrderVialInspectionChecksService,
        },
        {
          provide: ProductionOrderCylinderCalibrationsService,
          useValue: productionOrderCylinderCalibrationsService,
        },
        {
          provide: ProductionOrderSensoryChecksService,
          useValue: productionOrderSensoryChecksService,
        },
        {
          provide: ProductionOrderDateChecksService,
          useValue: productionOrderDateChecksService,
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

  it('sets download headers and returns a streamable file when exporting a production order', async () => {
    const buffer = Buffer.from('docx-content');
    productionOrdersService.exportProductionOrder.mockResolvedValue({
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'Lenh san xuat EUCIGA 5 ml 0030126.docx',
    });
    const response = {
      set: jest.fn(),
    } as unknown as Response;

    const result = await controller.exportProductionOrder(2031, response);

    expect(productionOrdersService.exportProductionOrder).toHaveBeenCalledWith(
      2031,
    );
    expect(response.set).toHaveBeenCalledWith({
      'Content-Disposition':
        'attachment; filename="Lenh san xuat EUCIGA 5 ml 0030126.docx"; filename*=UTF-8\'\'Lenh%20san%20xuat%20EUCIGA%205%20ml%200030126.docx',
      'Content-Length': buffer.length,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(result).toBeInstanceOf(StreamableFile);
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

  it('gets environment checks for a production order', async () => {
    const environmentChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderEnvironmentChecksService.findAllByProductionOrder.mockResolvedValue(
      environmentChecks,
    );

    await expect(controller.findEnvironmentChecks(2031)).resolves.toBe(
      environmentChecks,
    );
    expect(
      productionOrderEnvironmentChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets an environment check by id', async () => {
    const environmentCheck = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.findById.mockResolvedValue(
      environmentCheck,
    );

    await expect(controller.findEnvironmentCheckById(1)).resolves.toBe(
      environmentCheck,
    );
    expect(
      productionOrderEnvironmentChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates an environment check using the authenticated user', async () => {
    const createDto = {
      room: 'Phong pha che 1',
      temperature_c: 25.5,
      humidity_percent: 60.2,
      checked_at: '2026-06-11T08:00:00.000Z',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderEnvironmentChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createEnvironmentCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderEnvironmentChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('gets density checks for a production order', async () => {
    const densityChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDensityChecksService.findAllByProductionOrder.mockResolvedValue(
      densityChecks,
    );

    await expect(controller.findDensityChecks(2031)).resolves.toBe(
      densityChecks,
    );
    expect(
      productionOrderDensityChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a density check by id', async () => {
    const densityCheck = { id: 1, production_order_id: 2031 };
    productionOrderDensityChecksService.findById.mockResolvedValue(
      densityCheck,
    );

    await expect(controller.findDensityCheckById(1)).resolves.toBe(
      densityCheck,
    );
    expect(productionOrderDensityChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a density check using the authenticated user', async () => {
    const createDto = {
      empty_pycnometer_mass_g: 25,
      solution_pycnometer_mass_g: 75,
      water_pycnometer_mass_g: 75.5,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDensityChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDensityCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDensityChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('gets friability checks for a production order', async () => {
    const friabilityChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderFriabilityChecksService.findAllByProductionOrder.mockResolvedValue(
      friabilityChecks,
    );

    await expect(controller.findFriabilityChecks(2031)).resolves.toBe(
      friabilityChecks,
    );
    expect(
      productionOrderFriabilityChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a friability check by id', async () => {
    const friabilityCheck = { id: 1, production_order_id: 2031 };
    productionOrderFriabilityChecksService.findById.mockResolvedValue(
      friabilityCheck,
    );

    await expect(controller.findFriabilityCheckById(1)).resolves.toBe(
      friabilityCheck,
    );
    expect(
      productionOrderFriabilityChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a friability check using the authenticated user', async () => {
    const createDto = {
      total_weight_before_check: 1000,
      total_weight_after_check: 990,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFriabilityChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createFriabilityCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderFriabilityChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('gets disintegration checks for a production order', async () => {
    const disintegrationChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDisintegrationChecksService.findAllByProductionOrder.mockResolvedValue(
      disintegrationChecks,
    );

    await expect(controller.findDisintegrationChecks(2031)).resolves.toBe(
      disintegrationChecks,
    );
    expect(
      productionOrderDisintegrationChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a disintegration check by id', async () => {
    const disintegrationCheck = { id: 1, production_order_id: 2031 };
    productionOrderDisintegrationChecksService.findById.mockResolvedValue(
      disintegrationCheck,
    );

    await expect(controller.findDisintegrationCheckById(1)).resolves.toBe(
      disintegrationCheck,
    );
    expect(
      productionOrderDisintegrationChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a disintegration check using the authenticated user', async () => {
    const createDto = {
      dosage_form_stage: 'tablet',
      unit_1_passed: true,
      unit_2_passed: true,
      unit_3_passed: true,
      unit_4_passed: true,
      unit_5_passed: true,
      unit_6_passed: false,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDisintegrationChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDisintegrationCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderDisintegrationChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets hard capsule leakage checks for a production order', async () => {
    const leakageChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderHardCapsuleLeakageChecksService.findAllByProductionOrder.mockResolvedValue(
      leakageChecks,
    );

    await expect(controller.findHardCapsuleLeakageChecks(2031)).resolves.toBe(
      leakageChecks,
    );
    expect(
      productionOrderHardCapsuleLeakageChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a hard capsule leakage check by id', async () => {
    const leakageCheck = { id: 1, production_order_id: 2031 };
    productionOrderHardCapsuleLeakageChecksService.findById.mockResolvedValue(
      leakageCheck,
    );

    await expect(controller.findHardCapsuleLeakageCheckById(1)).resolves.toBe(
      leakageCheck,
    );
    expect(
      productionOrderHardCapsuleLeakageChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a hard capsule leakage check using the authenticated user', async () => {
    const createDto = {
      stage: 'before_coating',
      tested_capsule_count: 100,
      leaked_capsule_count: 2,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderHardCapsuleLeakageChecksService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createHardCapsuleLeakageCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderHardCapsuleLeakageChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets bottle volume checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderBottleVolumeChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findBottleVolumeChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderBottleVolumeChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a bottle volume check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderBottleVolumeChecksService.findById.mockResolvedValue(check);

    await expect(controller.findBottleVolumeCheckById(1)).resolves.toBe(check);
    expect(
      productionOrderBottleVolumeChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a bottle volume check using the authenticated user', async () => {
    const createDto = {
      bottle_1_volume: 10.01,
      bottle_2_volume: 10.02,
      bottle_3_volume: 9.98,
      bottle_4_volume: 10,
      bottle_5_volume: 10.03,
      bottle_6_volume: 9.99,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderBottleVolumeChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createBottleVolumeCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderBottleVolumeChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets shell weight checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031 }];
    productionOrderShellWeightChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findShellWeightChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderShellWeightChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a shell weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.findById.mockResolvedValue(check);

    await expect(controller.findShellWeightCheckById(1)).resolves.toBe(check);
    expect(
      productionOrderShellWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a shell weight check using the authenticated user', async () => {
    const createDto = {
      shell_1_weight: 50.01,
      shell_2_weight: 50.02,
      shell_3_weight: 49.98,
      shell_4_weight: 50,
      shell_5_weight: 50.03,
      shell_6_weight: 49.99,
      shell_7_weight: 50.04,
      shell_8_weight: 49.97,
      shell_9_weight: 50.05,
      shell_10_weight: 49.96,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderShellWeightChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createShellWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderShellWeightChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
    );
  });

  it('gets a ten-shell weight check for a production order', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.findByProductionOrder.mockResolvedValue(
      check,
    );

    await expect(controller.findTenShellWeightCheck(2031)).resolves.toBe(check);
    expect(
      productionOrderTenShellWeightChecksService.findByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a ten-shell weight check by id', async () => {
    const check = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findTenShellWeightCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderTenShellWeightChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('upserts a ten-shell weight check using the authenticated user', async () => {
    const createDto = {
      ten_shells_weight: 500.04,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderTenShellWeightChecksService.upsert.mockResolvedValue(result);

    await expect(
      controller.upsertTenShellWeightCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderTenShellWeightChecksService.upsert,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets vial inspection checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031, bag_number: 1 }];
    productionOrderVialInspectionChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findVialInspectionChecks(2031)).resolves.toBe(
      checks,
    );
    expect(
      productionOrderVialInspectionChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a vial inspection check by id', async () => {
    const check = { id: 1, production_order_id: 2031, bag_number: 1 };
    productionOrderVialInspectionChecksService.findById.mockResolvedValue(
      check,
    );

    await expect(controller.findVialInspectionCheckById(1)).resolves.toBe(
      check,
    );
    expect(
      productionOrderVialInspectionChecksService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a vial inspection check using the authenticated user', async () => {
    const createDto = {
      bag_number: 1,
      fiber_vial_count: 1,
      particulate_count: 2,
      damaged_count: 0,
      other_defect_count: 3,
      note: 'can theo doi',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderVialInspectionChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createVialInspectionCheck(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderVialInspectionChecksService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets a cylinder calibration for a production order', async () => {
    const calibration = {
      id: 1,
      production_order_id: 2031,
      cylinder_code: 'OD-001',
      calibration_number: 0.1234,
    };
    productionOrderCylinderCalibrationsService.findByProductionOrder.mockResolvedValue(
      calibration,
    );

    await expect(controller.findCylinderCalibration(2031)).resolves.toBe(
      calibration,
    );
    expect(
      productionOrderCylinderCalibrationsService.findByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('upserts a cylinder calibration using the authenticated user', async () => {
    const createDto = {
      cylinder_code: 'OD-001',
      calibration_number: '0.1234',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderCylinderCalibrationsService.upsert.mockResolvedValue(result);

    await expect(
      controller.upsertCylinderCalibration(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderCylinderCalibrationsService.upsert,
    ).toHaveBeenCalledWith(2031, createDto, user);
  });

  it('gets sensory checks for a production order', async () => {
    const checks = [{ id: 1, production_order_id: 2031, color: 'vang nhat' }];
    productionOrderSensoryChecksService.findAllByProductionOrder.mockResolvedValue(
      checks,
    );

    await expect(controller.findSensoryChecks(2031)).resolves.toBe(checks);
    expect(
      productionOrderSensoryChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a sensory check by id', async () => {
    const check = { id: 1, production_order_id: 2031, smell: 'thom' };
    productionOrderSensoryChecksService.findById.mockResolvedValue(check);

    await expect(controller.findSensoryCheckById(1)).resolves.toBe(check);
    expect(productionOrderSensoryChecksService.findById).toHaveBeenCalledWith(
      1,
    );
  });

  it('creates a sensory check using the authenticated user', async () => {
    const createDto = {
      color: 'vang nhat',
      smell: 'thom',
      taste: 'ngot',
      note: 'dat yeu cau',
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderSensoryChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createSensoryCheck(2031, createDto, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderSensoryChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
      {
        imagePath: undefined,
      },
    );
  });

  it('gets date checks for a production order', async () => {
    const dateChecks = [{ id: 1, production_order_id: 2031 }];
    productionOrderDateChecksService.findAllByProductionOrder.mockResolvedValue(
      dateChecks,
    );

    await expect(controller.findDateChecks(2031)).resolves.toBe(dateChecks);
    expect(
      productionOrderDateChecksService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a date check by id', async () => {
    const dateCheck = { id: 1, production_order_id: 2031 };
    productionOrderDateChecksService.findById.mockResolvedValue(dateCheck);

    await expect(controller.findDateCheckById(1)).resolves.toBe(dateCheck);
    expect(productionOrderDateChecksService.findById).toHaveBeenCalledWith(1);
  });

  it('creates a date check using the authenticated user', async () => {
    const createDto = { package_type: 'goi' };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderDateChecksService.create.mockResolvedValue(result);

    await expect(
      controller.createDateCheck(2031, createDto, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.create).toHaveBeenCalledWith(
      2031,
      createDto,
      user,
      {
        requestFilePath: undefined,
      },
    );
  });

  it('updates a date check request data', async () => {
    const updateDto = { package_type: 'lo' };
    const result = { id: 1, package_type: 'lo' };
    productionOrderDateChecksService.update.mockResolvedValue(result);

    await expect(
      controller.updateDateCheck(1, updateDto, undefined),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.update).toHaveBeenCalledWith(
      1,
      updateDto,
      {
        requestFilePath: undefined,
      },
    );
  });

  it('approves a date check using the authenticated user', async () => {
    const approveDto = { approval_status: 'approved' };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, approval_status: 'approved' };
    productionOrderDateChecksService.approve.mockResolvedValue(result);

    await expect(
      controller.approveDateCheck(1, approveDto, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.approve).toHaveBeenCalledWith(
      1,
      approveDto,
      user,
    );
  });

  it('deletes a date check', async () => {
    const result = { id: 1 };
    productionOrderDateChecksService.delete.mockResolvedValue(result);

    await expect(controller.deleteDateCheck(1)).resolves.toBe(result);
    expect(productionOrderDateChecksService.delete).toHaveBeenCalledWith(1);
  });

  it('adds date check images using the authenticated user', async () => {
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, images: [] };
    productionOrderDateChecksService.addImages.mockResolvedValue(result);

    await expect(
      controller.addDateCheckImages(1, undefined, { user }),
    ).resolves.toBe(result);
    expect(productionOrderDateChecksService.addImages).toHaveBeenCalledWith(
      1,
      [],
      user,
    );
  });

  it('deletes a date check image', async () => {
    const result = { id: 1 };
    productionOrderDateChecksService.deleteImage.mockResolvedValue(result);

    await expect(controller.deleteDateCheckImage(1)).resolves.toBe(result);
    expect(productionOrderDateChecksService.deleteImage).toHaveBeenCalledWith(
      1,
    );
  });

  it('gets finished product summaries for a production order', async () => {
    const summaries = [{ id: 1, production_order_id: 2031 }];
    productionOrderFinishedProductSummariesService.findAllByProductionOrder.mockResolvedValue(
      summaries,
    );

    await expect(controller.findFinishedProductSummaries(2031)).resolves.toBe(
      summaries,
    );
    expect(
      productionOrderFinishedProductSummariesService.findAllByProductionOrder,
    ).toHaveBeenCalledWith(2031);
  });

  it('gets a finished product summary by id', async () => {
    const summary = { id: 1, production_order_id: 2031 };
    productionOrderFinishedProductSummariesService.findById.mockResolvedValue(
      summary,
    );

    await expect(controller.findFinishedProductSummaryById(1)).resolves.toBe(
      summary,
    );
    expect(
      productionOrderFinishedProductSummariesService.findById,
    ).toHaveBeenCalledWith(1);
  });

  it('creates a finished product summary using the authenticated user', async () => {
    const createDto = {
      package_count: 12,
      boxes_per_package: 24,
      loose_box_count: 3,
    };
    const user = { id: 7, name: 'Binh' };
    const result = { id: 1, production_order_id: 2031 };
    productionOrderFinishedProductSummariesService.create.mockResolvedValue(
      result,
    );

    await expect(
      controller.createFinishedProductSummary(2031, createDto, { user }),
    ).resolves.toBe(result);
    expect(
      productionOrderFinishedProductSummariesService.create,
    ).toHaveBeenCalledWith(2031, createDto, user);
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
