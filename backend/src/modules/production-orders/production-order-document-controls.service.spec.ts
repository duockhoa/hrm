import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  ProductionOrderDocumentControlsService,
  productionOrderDocumentControlInclude,
} from './production-order-document-controls.service';

describe('ProductionOrderDocumentControlsService', () => {
  let prisma: {
    productionOrders: { findUnique: jest.Mock };
    productionOrderDocumentControls: { upsert: jest.Mock; update: jest.Mock };
  };
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
    };
    service = new ProductionOrderDocumentControlsService(
      prisma as unknown as PrismaService,
    );
  });

  it('records paper dossier issuance without creating a feature snapshot', async () => {
    await service.issueBatchRecord(2031, { id: 7 });
    expect(prisma.productionOrderDocumentControls.upsert).toHaveBeenCalledWith({
      where: { production_order_id: 2031 },
      create: {
        production_order_id: 2031,
        batch_record_issued_by_id: 7,
        batch_record_issued_at: expect.any(Date),
      },
      update: {
        batch_record_issued_by_id: 7,
        batch_record_issued_at: expect.any(Date),
      },
      include: productionOrderDocumentControlInclude,
    });
    expect(
      prisma.productionOrderDocumentControls.update,
    ).not.toHaveBeenCalled();
  });

  it('keeps the existing snapshot during paper dossier issuance', async () => {
    const original = {
      feature_config_snapshot: { version: 1, source: 'legacy', features: [] },
    };
    prisma.productionOrderDocumentControls.upsert.mockResolvedValue(original);
    await expect(service.issueBatchRecord(2031, { id: 7 })).resolves.toBe(
      original,
    );
    expect(prisma.productionOrderDocumentControls.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          batch_record_issued_by_id: 7,
          batch_record_issued_at: expect.any(Date),
        },
      }),
    );
    expect(
      prisma.productionOrderDocumentControls.update,
    ).not.toHaveBeenCalled();
  });

  it('does not store a snapshot during document receipt', async () => {
    await service.receiveBatchRecord(2031, { id: 7 });
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
    expect(
      prisma.productionOrderDocumentControls.upsert,
    ).not.toHaveBeenCalled();
  });
});
