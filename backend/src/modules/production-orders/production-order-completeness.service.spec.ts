import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import {
  buildItemFeatureConfig,
  createFeatureConfigSnapshot,
  ItemFeatureConfigEntry,
} from '../features/item-feature-config';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import { ProductionOrderCompletenessService } from './production-order-completeness.service';
import { ProductionOrderLocalCompletenessService } from './production-order-local-completeness.service';

const section = (
  key: string,
  overrides: Partial<ItemFeatureConfigEntry> = {},
): ItemFeatureConfigEntry => ({
  feature_id: 1,
  key,
  kind: 'section',
  label: key,
  group_name: null,
  order: 10,
  enabled: true,
  required: true,
  ...overrides,
});

describe('ProductionOrderCompletenessService', () => {
  const itemCode = 'TP00001';
  let prisma: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderMixingRecords: { findMany: jest.Mock };
    productionOrderAttachments: { count: jest.Mock };
  };
  let features: { findConfigByItemCode: jest.Mock };
  let sap: { getProductionOrderById: jest.Mock };
  let service: ProductionOrderCompletenessService;

  beforeEach(() => {
    prisma = {
      productionOrders: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ item_code: itemCode, documentControl: null }),
      },
      productionOrderMixingRecords: { findMany: jest.fn() },
      productionOrderAttachments: { count: jest.fn() },
    };
    features = {
      findConfigByItemCode: jest
        .fn()
        .mockResolvedValue(buildItemFeatureConfig(itemCode, [])),
    };
    sap = { getProductionOrderById: jest.fn() };
    service = new ProductionOrderCompletenessService(
      prisma as unknown as PrismaService,
      features as unknown as FeaturesService,
      sap as unknown as SapB1ServiceLayerClient,
    );
  });

  it('starts with no mandatory sections and does not query data or SAP', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('environment_checks', { required: false }),
      ]),
    );
    const result = await service.findByProductionOrder(2031);
    expect(result).toMatchObject({
      required_count: 0,
      completed_count: 0,
      required_sections: [],
      configuration_source: 'item',
    });
    expect(prisma.productionOrders.findUnique).toHaveBeenCalledTimes(1);
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
  });

  it('counts only enabled required sections using their exact relations', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('environment_checks', { order: 20 }),
        section('product_sensory_checks'),
        section('date_checks', { enabled: false }),
        section('sensory_checks', { required: false }),
      ]),
    );
    prisma.productionOrders.findUnique
      .mockResolvedValueOnce({ item_code: itemCode })
      .mockResolvedValueOnce({
        _count: { environmentChecks: 2, tenUnitSensoryChecks: 0 },
      });
    const result = await service.findByProductionOrder(2031);
    expect(
      result.required_sections.map(({ key, status }) => ({ key, status })),
    ).toEqual([
      { key: 'product_sensory_checks', status: 'missing' },
      { key: 'environment_checks', status: 'has_data' },
    ]);
    expect(result).toMatchObject({
      required_count: 2,
      completed_count: 1,
      is_complete: false,
    });
    expect(prisma.productionOrders.findUnique).toHaveBeenLastCalledWith({
      where: { id: 2031 },
      select: {
        id: true,
        _count: {
          select: { environmentChecks: true, tenUnitSensoryChecks: true },
        },
      },
    });
  });

  it('does not treat deleted deviations as existing batch records', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('production_order_deviations'),
      ]),
    );
    prisma.productionOrders.findUnique
      .mockResolvedValueOnce({ item_code: itemCode })
      .mockResolvedValueOnce({ _count: { deviations: 0 } });
    const result = await service.findByProductionOrder(2031);
    expect(result.missing_sections).toEqual([
      expect.objectContaining({ key: 'production_order_deviations' }),
    ]);
    expect(prisma.productionOrders.findUnique).toHaveBeenLastCalledWith({
      where: { id: 2031 },
      select: {
        id: true,
        _count: { select: { deviations: { where: { deleted_at: null } } } },
      },
    });
  });

  it('uses the stored snapshot even after the item rules change', async () => {
    const config = buildItemFeatureConfig(itemCode, [
      section('environment_checks', { required: false }),
    ]);
    prisma.productionOrders.findUnique.mockResolvedValue({
      item_code: itemCode,
      documentControl: {
        feature_config_snapshot: createFeatureConfigSnapshot(
          config,
          new Date(),
        ),
      },
    });
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [section('date_checks')]),
    );
    const result = await service.findByProductionOrder(2031);
    expect(result).toMatchObject({
      configuration_source: 'snapshot',
      required_count: 0,
    });
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
  });

  it('does not silently replace a corrupt snapshot with current settings', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue({
      item_code: itemCode,
      documentControl: { feature_config_snapshot: { version: 99 } },
    });
    await expect(service.findByProductionOrder(2031)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
  });

  it('ignores blank mixing templates and accepts zero, false, and uploaded images', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [section('mixing_records')]),
    );
    const record = (
      result_value: string | null,
      result_image_path: string | null = null,
    ) => ({
      stages: [
        {
          steps: [
            {
              parameters: [
                { data_type: 'text', result_value, result_image_path },
              ],
            },
          ],
        },
      ],
    });
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([
      record(null),
      record('  '),
      record('0'),
      record('false'),
      record(null, '/uploads/result.jpg'),
    ]);
    const result = await service.findByProductionOrder(2031);
    expect(result.required_sections[0]).toMatchObject({
      record_count: 3,
      status: 'has_data',
    });
    expect(prisma.productionOrderMixingRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { production_order_id: 2031 } }),
    );
    prisma.productionOrderMixingRecords.findMany.mockResolvedValue([
      record(null),
    ]);
    expect(
      (await service.findByProductionOrder(2031)).missing_sections,
    ).toHaveLength(1);
  });

  it('requires attached files and rechecks after deletion', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('production_order_attachments'),
      ]),
    );
    prisma.productionOrderAttachments.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    expect((await service.findByProductionOrder(2031)).completed_count).toBe(1);
    expect(
      (await service.findByProductionOrder(2031)).missing_sections,
    ).toHaveLength(1);
    expect(prisma.productionOrderAttachments.count).toHaveBeenCalledWith({
      where: { production_order_id: 2031, files: { some: {} } },
    });
  });

  it('supports singleton sections and normalizes legacy section aliases', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('cylinder_calibratio'),
        section('vial_inspection_summary'),
      ]),
    );
    prisma.productionOrders.findUnique
      .mockResolvedValueOnce({ item_code: itemCode })
      .mockResolvedValueOnce({
        cylinderCalibration: { id: 1 },
        _count: { vialInspectionChecks: 1 },
      });
    const result = await service.findByProductionOrder(2031);
    expect(result.completed_count).toBe(2);
    expect(result.required_sections.map((entry) => entry.key)).toContain(
      'vial_inspection_checks',
    );
  });

  it('reports SAP unavailable separately from an empty production order', async () => {
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [section('production_order_lines')]),
    );
    sap.getProductionOrderById
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ProductionOrderLines: [] });
    const unavailable = await service.findByProductionOrder(2031);
    expect(unavailable.unavailable_sections).toHaveLength(1);
    expect(unavailable.missing_sections).toHaveLength(0);
    expect(unavailable.is_complete).toBe(false);
    expect(
      (await service.findByProductionOrder(2031)).missing_sections,
    ).toHaveLength(1);
  });

  it('checks local requirements without an external connector and keeps external requirements unavailable', async () => {
    const localService = new ProductionOrderLocalCompletenessService(
      prisma as unknown as PrismaService,
      features as unknown as FeaturesService,
    );
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig(itemCode, [
        section('environment_checks'),
        section('production_order_lines'),
      ]),
    );
    prisma.productionOrders.findUnique
      .mockResolvedValueOnce({ item_code: itemCode })
      .mockResolvedValueOnce({ _count: { environmentChecks: 1 } });
    const result = await localService.findByProductionOrder(2031);
    expect(result).toMatchObject({
      required_count: 2,
      completed_count: 1,
      is_complete: false,
      missing_sections: [],
      unavailable_sections: [
        expect.objectContaining({
          key: 'production_order_lines',
          record_count: null,
        }),
      ],
    });
    expect(sap.getProductionOrderById).not.toHaveBeenCalled();
  });

  it('rejects an unknown lot before querying configuration', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    await expect(service.findByProductionOrder(2031)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
  });
});
