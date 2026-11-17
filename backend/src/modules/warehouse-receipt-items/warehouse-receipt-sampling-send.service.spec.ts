import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, WarehouseReceiptSamplingSendBatches } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { FeaturesService } from '../features/features.service';
import { buildItemFeatureConfig } from '../features/item-feature-config';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { WarehouseReceiptSamplingSendService } from './warehouse-receipt-sampling-send.service';

jest.mock('axios');
const post = axios.post as jest.Mock;
const requestId = '87c9ad62-d469-44b5-bbdf-8bc074d09c74';

describe('Warehouse receipt sampling sends', () => {
  const drafts = [1, 2].map((id) => ({
    id,
    created_by_id: 5,
    warehouse_receipt_item_id: id + 10,
    item_code: `NL${id}`,
    item_name: `Material ${id}`,
    quantity: new Prisma.Decimal('125.125'),
    unit: 'kg',
    supplier_name: 'Supplier',
    lot_number: `LOT${id}`,
    expiry_date: new Date('2027-12-31T00:00:00Z'),
    location: `Warehouse ${id}`,
    receipt: { samplingRequest: null },
  }));
  const batches = new Map<string, WarehouseReceiptSamplingSendBatches>();
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    users: { findUnique: jest.fn() },
    warehouseReceiptSamplingSendBatches: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    warehouseReceiptItemSamplingRequestDrafts: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    warehouseReceiptItemSamplingRequests: { createMany: jest.fn() },
    productionOrders: { findUnique: jest.fn() },
    productionOrderDocumentControls: { upsert: jest.fn(), update: jest.fn() },
    productionSpecifications: { findUnique: jest.fn() },
    productionOrderRegistrationNumbers: { upsert: jest.fn() },
    productionOrderSamplingRequests: { create: jest.fn() },
  };
  const email = { resolveRecipients: jest.fn() };
  const features = { findConfigByItemCode: jest.fn() };
  const service = new WarehouseReceiptSamplingSendService(
    prisma as unknown as PrismaService,
    email as unknown as EmailSettingsService,
    features as unknown as FeaturesService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    batches.clear();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.users.findUnique.mockResolvedValue({
      id: 5,
      name: 'Sender',
      username: 'sender',
      email: 'sender@example.test',
    });
    email.resolveRecipients.mockResolvedValue(['qc@example.test']);
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      drafts,
    );
    prisma.warehouseReceiptSamplingSendBatches.findUnique.mockImplementation(
      ({ where }) => Promise.resolve(batches.get(where.id) ?? null),
    );
    prisma.warehouseReceiptSamplingSendBatches.findUniqueOrThrow.mockImplementation(
      ({ where }) => Promise.resolve(batches.get(where.id)),
    );
    prisma.warehouseReceiptSamplingSendBatches.create.mockImplementation(
      ({ data }) => {
        const row = {
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          sent_at: null,
          google_doc_url: null,
          last_error: null,
        };
        batches.set(row.id, row);
        return Promise.resolve(row);
      },
    );
    prisma.warehouseReceiptSamplingSendBatches.update.mockImplementation(
      ({ where, data }) => {
        const row = { ...batches.get(where.id)!, ...data };
        batches.set(where.id, row);
        return Promise.resolve(row);
      },
    );
    prisma.warehouseReceiptItemSamplingRequests.createMany.mockResolvedValue({
      count: 2,
    });
    prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany.mockResolvedValue(
      { count: 2 },
    );
    post.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('sends all snapshots using the supplied Apps Script contract, then saves and removes only those drafts', async () => {
    const result = await service.send(requestId, 5);
    expect(result).toEqual({
      status: 'success',
      requestId,
      sentCount: 2,
      googleDocUrl: null,
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('script.google.com/macros/s/'),
      {
        requester: 'Sender',
        type: 'NL',
        recipients: ['qc@example.test'],
        materials: drafts.map((draft) => ({
          materialCode: draft.item_code,
          sampleName: draft.item_name,
          quantity: '125.125 kg',
          supplier: 'Supplier',
          lotNumber: draft.lot_number,
          expiryDate: '31/12/2027',
          samplingLocation: draft.location,
        })),
      },
      expect.objectContaining({
        timeout: 120000,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(email.resolveRecipients).toHaveBeenCalledWith('sampling_request', 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany,
    ).toHaveBeenCalledWith({
      data: drafts.map((draft) => ({
        warehouse_receipt_item_id: draft.warehouse_receipt_item_id,
        location: draft.location,
        sender_id: 5,
        sent_at: expect.any(Date),
        google_doc_url: null,
      })),
    });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).toHaveBeenCalledWith({ where: { id: { in: [1, 2] }, created_by_id: 5 } });
    expect(batches.get(requestId)).toMatchObject({
      status: 'completed',
      active_key: null,
    });
  });

  const finishedDrafts = drafts.map((draft) => ({
    ...draft,
    warehouse_receipt_item_id: null,
    production_order_id: draft.id + 20,
    request_type: 'TP',
    item_code: 'TP001',
    receipt: null,
  }));
  function prepareFinished() {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      finishedDrafts,
    );
    prisma.productionOrders.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.id,
        item_code: 'TP001',
        item: { registration: { id: 7, registration_number: 'VD-123' } },
      }),
    );
    prisma.productionOrderDocumentControls.upsert.mockResolvedValue({
      feature_config_snapshot: null,
      production_specification_snapshot: null,
    });
    features.findConfigByItemCode.mockResolvedValue(
      buildItemFeatureConfig('TP001', []),
    );
    prisma.productionSpecifications.findUnique.mockResolvedValue(null);
  }
  it('sends own finished drafts together and captures both snapshots only after confirmation', async () => {
    prepareFinished();
    post.mockImplementation(async () => {
      expect(
        prisma.productionOrderDocumentControls.upsert,
      ).not.toHaveBeenCalled();
      expect(
        prisma.productionOrderSamplingRequests.create,
      ).not.toHaveBeenCalled();
      return {
        data: {
          success: true,
          data: { url: 'https://docs.google.com/document/d/tp' },
        },
      };
    });
    await service.send(requestId, 5, 'TP');
    expect(post.mock.calls[0][1]).toMatchObject({
      type: 'TP',
      materials: finishedDrafts.map((draft) =>
        expect.objectContaining({
          materialCode: draft.item_code,
          samplingLocation: draft.location,
        }),
      ),
    });
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { created_by_id: 5, request_type: 'TP' },
      }),
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany,
    ).not.toHaveBeenCalled();
    expect(prisma.productionOrderDocumentControls.update).toHaveBeenCalledTimes(
      4,
    );
    for (const draft of finishedDrafts) {
      expect(
        prisma.productionOrderDocumentControls.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { production_order_id: draft.production_order_id },
          data: { feature_config_snapshot: expect.any(Object) },
        }),
      );
      expect(
        prisma.productionOrderDocumentControls.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { production_order_id: draft.production_order_id },
          data: { production_specification_snapshot: expect.any(Object) },
        }),
      );
      expect(
        prisma.productionOrderSamplingRequests.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            production_order_id: draft.production_order_id,
            sender_id: 5,
            location: draft.location,
            status: 'sent',
            google_doc_url: 'https://docs.google.com/document/d/tp',
          }),
        }),
      );
    }
    expect(
      prisma.productionOrderRegistrationNumbers.upsert,
    ).toHaveBeenCalledTimes(2);
    expect(batches.get(requestId)).toMatchObject({
      status: 'completed',
      active_key: null,
    });
    await service.send(requestId, 5, 'TP');
    expect(post).toHaveBeenCalledTimes(1);
    expect(prisma.productionOrderSamplingRequests.create).toHaveBeenCalledTimes(
      2,
    );
    await expect(service.send(requestId, 5, 'NL')).rejects.toThrow(
      ConflictException,
    );
  });
  it('preserves original finished snapshots on subsequent sends', async () => {
    prepareFinished();
    prisma.productionOrderDocumentControls.upsert.mockResolvedValue({
      feature_config_snapshot: { original: true },
      production_specification_snapshot: { original: true },
    });
    await service.send(requestId, 5, 'TP');
    expect(
      post.mock.calls[0][1].materials.every(
        (material: { supplier: string }) =>
          material.supplier === 'Cty CP Dược Khoa',
      ),
    ).toBe(true);
    expect(
      prisma.productionOrderDocumentControls.update,
    ).not.toHaveBeenCalled();
    expect(features.findConfigByItemCode).not.toHaveBeenCalled();
    expect(prisma.productionOrderSamplingRequests.create).toHaveBeenCalledTimes(
      2,
    );
  });
  it('keeps finished drafts and does not snapshot when Google rejects the email', async () => {
    prepareFinished();
    post.mockResolvedValue({ data: { success: false, error: 'rejected' } });
    await expect(service.send(requestId, 5, 'TP')).rejects.toThrow();
    expect(
      prisma.productionOrderDocumentControls.upsert,
    ).not.toHaveBeenCalled();
    expect(
      prisma.productionOrderSamplingRequests.create,
    ).not.toHaveBeenCalled();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
  });
  it('retries database finalization after snapshot failure without resending email', async () => {
    prepareFinished();
    prisma.productionOrderDocumentControls.upsert.mockRejectedValueOnce(
      new Error('DB unavailable'),
    );
    await expect(service.send(requestId, 5, 'TP')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(batches.get(requestId)?.status).toBe('confirmed');
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
    await service.send(requestId, 5, 'TP');
    expect(post).toHaveBeenCalledTimes(1);
    expect(batches.get(requestId)?.status).toBe('completed');
  });

  it('stores the returned document URL for every sent receipt', async () => {
    post.mockResolvedValue({
      data: {
        success: true,
        data: { url: 'https://docs.google.com/document/d/test' },
      },
    });
    await service.send(requestId, 5);
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany.mock.calls[0][0].data.every(
        (row: { google_doc_url: string }) =>
          row.google_doc_url === 'https://docs.google.com/document/d/test',
      ),
    ).toBe(true);
  });
  it('scopes locked rows, loaded drafts, active batch and finalization to the sender', async () => {
    await service.send(requestId, 5);
    expect(prisma.$queryRaw.mock.calls[0][1]).toBe(5);
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { created_by_id: 5, request_type: 'NL' },
      }),
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.findMany,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: { in: [1, 2] }, created_by_id: 5 },
      }),
    );
    expect(
      prisma.warehouseReceiptSamplingSendBatches.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          active_key: 'warehouse-receipt-sampling:5',
          sender_id: 5,
        }),
      }),
    );
  });
  it('never sends a foreign-owned draft even if a repository returns it incorrectly', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValue(
      [{ ...drafts[0], created_by_id: 6 }],
    );
    await expect(service.send(requestId, 5)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
  });
  it('never finalizes or removes a snapshot whose owner no longer matches', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany
      .mockResolvedValueOnce(drafts)
      .mockResolvedValueOnce([]);
    await expect(service.send(requestId, 5)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany,
    ).not.toHaveBeenCalled();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
  });
  it('does not expose or replay another users batch ID', async () => {
    await service.send(requestId, 5);
    await expect(service.send(requestId, 6)).rejects.toThrow(ConflictException);
    expect(post).toHaveBeenCalledTimes(1);
  });
  it.each([
    { success: true },
    { success: true, data: { url: '' } },
    { success: true, data: { url: 'javascript:alert(1)' } },
  ])(
    'accepts confirmed sends without a usable Google URL: %p',
    async (response) => {
      post.mockResolvedValue({ data: response });
      await expect(service.send(requestId, 5)).resolves.toMatchObject({
        googleDocUrl: null,
      });
      expect(
        prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
      ).toHaveBeenCalled();
    },
  );

  it('keeps all drafts when Apps Script reports failure', async () => {
    post.mockResolvedValue({
      data: { success: false, error: 'Mail quota exceeded' },
    });
    await expect(service.send(requestId, 5)).rejects.toThrow(
      BadGatewayException,
    );
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany,
    ).not.toHaveBeenCalled();
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
    expect(batches.get(requestId)).toMatchObject({
      status: 'failed',
      active_key: null,
    });
  });

  it.each(['timeout', 'malformed response'])(
    'keeps drafts and prevents resend after %s',
    async (mode) => {
      if (mode === 'timeout') post.mockRejectedValue(new Error('ETIMEDOUT'));
      else post.mockResolvedValue({ data: '<html>Sign in</html>' });
      await expect(service.send(requestId, 5)).rejects.toThrow(
        BadGatewayException,
      );
      expect(batches.get(requestId)?.status).toBe('uncertain');
      await expect(service.send(requestId, 5)).rejects.toThrow(
        ConflictException,
      );
      expect(post).toHaveBeenCalledTimes(1);
      expect(
        prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
      ).not.toHaveBeenCalled();
    },
  );

  it('does not resend when the browser repeats a completed request', async () => {
    await service.send(requestId, 5);
    await service.send(requestId, 5);
    expect(post).toHaveBeenCalledTimes(1);
    expect(
      prisma.warehouseReceiptItemSamplingRequests.createMany,
    ).toHaveBeenCalledTimes(1);
  });

  it('retries only local finalization after Google confirmation and a database failure', async () => {
    prisma.warehouseReceiptItemSamplingRequests.createMany.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(service.send(requestId, 5)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(batches.get(requestId)?.status).toBe('confirmed');
    expect(
      prisma.warehouseReceiptItemSamplingRequestDrafts.deleteMany,
    ).not.toHaveBeenCalled();
    await expect(service.send(requestId, 5)).resolves.toMatchObject({
      status: 'success',
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('rejects empty and incomplete drafts before contacting Google', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValueOnce(
      [],
    );
    await expect(service.send(requestId, 5)).rejects.toThrow(
      BadRequestException,
    );
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValueOnce(
      [{ ...drafts[0], location: '' }],
    );
    await expect(service.send(requestId, 5)).rejects.toThrow(
      BadRequestException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects an already sent receipt without contacting Google', async () => {
    prisma.warehouseReceiptItemSamplingRequestDrafts.findMany.mockResolvedValueOnce(
      [{ ...drafts[0], receipt: { samplingRequest: { id: 8 } } }],
    );
    await expect(service.send(requestId, 5)).rejects.toThrow(ConflictException);
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects missing recipients without contacting Google', async () => {
    email.resolveRecipients.mockResolvedValue([]);
    await expect(service.send(requestId, 5)).rejects.toThrow(
      BadRequestException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects another concurrent batch at the database unique constraint', async () => {
    prisma.warehouseReceiptSamplingSendBatches.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(service.send(requestId, 5)).rejects.toThrow(ConflictException);
    expect(post).not.toHaveBeenCalled();
  });
});
