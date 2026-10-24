import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { productionOrderModelWhere } from 'src/access/production-order-scope.extension';
import { ProductionOrderWeighingRecordsService } from './production-order-weighing-records.service';

describe('ProductionOrderWeighingRecordsService', () => {
  let service: ProductionOrderWeighingRecordsService;
  let prisma: any;
  const record = {
    id: 1,
    production_order_id: 42,
    record_code: 'PC-001',
    status: 'draft',
    qa_staff_approved_at: null,
    ipc_staff_approved_at: null,
  };
  beforeEach(() => {
    prisma = {
      productionOrders: { findUnique: jest.fn().mockResolvedValue({ id: 42 }) },
      productionOrderWeighingRecords: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ ...record }),
        create: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ id: 1, ...data })),
        update: jest
          .fn()
          .mockImplementation(async ({ data }) => ({ ...record, ...data })),
        delete: jest.fn().mockResolvedValue(record),
      },
    };
    service = new ProductionOrderWeighingRecordsService(
      prisma as PrismaService,
    );
  });

  it('creates a header for the selected order using the authenticated creator', async () => {
    const result = await service.create(
      42,
      { description: ' Can nguyen lieu ' },
      { id: '7' },
    );
    expect(result).toMatchObject({
      production_order_id: 42,
      created_by_id: 7,
      description: 'Can nguyen lieu',
    });
    expect(result.record_code).toMatch(/^PC-[a-f0-9-]{36}$/);
  });

  it('rejects missing authentication and spoofed creator or approval fields', async () => {
    await expect(service.create(42, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      service.create(42, { created_by_id: 99 } as any, { id: 7 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(1, { qa_staff_approved_by_id: 99 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productionOrderWeighingRecords.create).not.toHaveBeenCalled();
  });

  it('returns 404 for missing orders on create and list', async () => {
    prisma.productionOrders.findUnique.mockResolvedValue(null);
    await expect(service.create(42, {}, { id: 7 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findAllByProductionOrder(42)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.productionOrderWeighingRecords.create).not.toHaveBeenCalled();
  });

  it('inherits the existing production-order visibility filter', () => {
    expect(
      productionOrderModelWhere('ProductionOrderWeighingRecords', [42]),
    ).toEqual({ production_order_id: { in: [42] } });
  });

  it('lists only records belonging to the requested order', async () => {
    await service.findAllByProductionOrder(42);
    expect(prisma.productionOrderWeighingRecords.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { production_order_id: 42 } }),
    );
  });

  it('returns 404 for a missing record', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue(null);
    await expect(service.findById(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    { record_code: '' },
    { record_code: 'x'.repeat(51) },
    { description: 3 },
    { status: 'approved' },
    { status: null },
    {},
  ])('rejects invalid update %j', async (dto) => {
    await expect(service.update(1, dto as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.productionOrderWeighingRecords.update).not.toHaveBeenCalled();
  });

  it('clears description and completes a record', async () => {
    await service.update(1, { description: null, status: 'completed' });
    expect(prisma.productionOrderWeighingRecords.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { description: null, status: 'completed' },
        where: {
          id: 1,
          status: 'draft',
          qa_staff_approved_at: null,
          ipc_staff_approved_at: null,
        },
      }),
    );
  });

  it('blocks edits and deletion after the first approval', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      qa_staff_approved_at: new Date(),
    });
    await expect(
      service.update(1, { description: 'changed' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.delete(1)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.productionOrderWeighingRecords.delete).not.toHaveBeenCalled();
  });

  it('requires completion before signing', async () => {
    await expect(service.approveByQaStaff(1, { id: 7 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['qa', 'ipc'])(
    'records the %s signature and approves when both have signed',
    async (role) => {
      const now = new Date();
      prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
        ...record,
        status: 'completed',
        ...(role === 'qa'
          ? { ipc_staff_approved_at: now }
          : { qa_staff_approved_at: now }),
      });
      const result =
        role === 'qa'
          ? await service.approveByQaStaff(1, { id: 7 })
          : await service.approveByIpcStaff(1, { id: 7 });
      expect(result.status).toBe('approved');
      expect(result[`${role}_staff_approved_by_id`]).toBe(7);
      expect(result[`${role}_staff_approved_at`]).toBeInstanceOf(Date);
    },
  );

  it('keeps a single-signature record completed and rejects replacing that signature', async () => {
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      status: 'completed',
    });
    expect((await service.approveByQaStaff(1, { id: 7 })).status).toBe(
      'completed',
    );
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      status: 'completed',
      qa_staff_approved_at: new Date(),
    });
    await expect(service.approveByQaStaff(1, { id: 8 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps duplicate codes and concurrent signature changes to conflicts', async () => {
    const error = (code: string) =>
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code,
        clientVersion: '6',
      });
    prisma.productionOrderWeighingRecords.create.mockRejectedValue(
      error('P2002'),
    );
    await expect(
      service.create(42, { record_code: 'PC-001' }, { id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
    prisma.productionOrderWeighingRecords.findUnique.mockResolvedValue({
      ...record,
      status: 'completed',
    });
    prisma.productionOrderWeighingRecords.update.mockRejectedValue(
      error('P2025'),
    );
    await expect(
      service.approveByIpcStaff(1, { id: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
