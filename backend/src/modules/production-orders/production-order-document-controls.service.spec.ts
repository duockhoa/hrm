import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import { buildItemFeatureConfig } from '../features/item-feature-config';
import { ProductionOrderDocumentControlsService } from './production-order-document-controls.service';

describe('ProductionOrderDocumentControlsService snapshots', () => {
  const config = buildItemFeatureConfig('TP00001', [
    {
      feature_id: 1,
      key: 'environment_checks',
      kind: 'section',
      label: 'Nhiệt độ/độ ẩm',
      group_name: null,
      order: 10,
      enabled: true,
      required: true,
    },
  ]);
  let prisma: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderDocumentControls: { upsert: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let features: { findConfigByItemCode: jest.Mock };
  let service: ProductionOrderDocumentControlsService;

  beforeEach(() => {
    prisma = {
      productionOrders: {
        findUnique: jest.fn().mockResolvedValue({ item_code: 'TP00001' }),
      },
      productionOrderDocumentControls: {
        upsert: jest.fn().mockResolvedValue({ feature_config_snapshot: null }),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    features = { findConfigByItemCode: jest.fn().mockResolvedValue(config) };
    service = new ProductionOrderDocumentControlsService(
      prisma as unknown as PrismaService,
      features as unknown as FeaturesService,
    );
  });

  it('saves the first issue and its rules in one transaction', async () => {
    await service.issueBatchRecord(2031, { id: 7 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(features.findConfigByItemCode).toHaveBeenCalledWith(
      'TP00001',
      undefined,
      prisma,
    );
    expect(prisma.productionOrderDocumentControls.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          feature_config_snapshot: expect.objectContaining({
            version: 1,
            item_code: 'TP00001',
            features: config.features,
          }),
        },
      }),
    );
  });

  it('keeps the snapshot on repeated issuance and item configuration changes', async () => {
    const original = {
      feature_config_snapshot: { version: 1, source: 'legacy', features: [] },
    };
    prisma.productionOrderDocumentControls.upsert.mockResolvedValue(original);
    await expect(service.issueBatchRecord(2031, { id: 7 })).resolves.toBe(
      original,
    );
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
    expect(
      prisma.productionOrderDocumentControls.update,
    ).not.toHaveBeenCalled();
  });

  it('does not store a snapshot during document receipt', async () => {
    await service.receiveBatchRecord(2031, { id: 7 });
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
    expect(prisma.productionOrderDocumentControls.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          batch_record_received_by_id: 7,
          batch_record_received_at: expect.any(Date),
        },
      }),
    );
  });

  it('requires an authenticated issuer', async () => {
    await expect(service.issueBatchRecord(2031)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
