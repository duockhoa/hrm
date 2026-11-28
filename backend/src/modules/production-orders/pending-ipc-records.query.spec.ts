import type { PrismaService } from 'src/prisma.service';
import { ProductionOrderMixingRecordsService } from './production-order-mixing-records.service';
import { ProductionOrderWeighingRecordsService } from './production-order-weighing-records.service';

describe.each([
  [
    'mixing',
    ProductionOrderMixingRecordsService,
    'productionOrderMixingRecords',
  ],
  [
    'weighing',
    ProductionOrderWeighingRecordsService,
    'productionOrderWeighingRecords',
  ],
] as const)('pending IPC %s records', (kind, Service, delegate) => {
  it('requires a sent PYCLM for the same order and no IPC signature on the record before paging', async () => {
    const rows = [{ id: 42 }];
    const findMany = jest.fn().mockResolvedValue(rows);
    const count = jest.fn().mockResolvedValue(26);
    const service = new Service({
      [delegate]: { findMany, count },
      $transaction: (reads: Promise<unknown>[]) => Promise.all(reads),
    } as unknown as PrismaService);

    await expect(
      service.findPendingIpc({
        page: 2,
        limit: 25,
        search: '#42',
        item_code: 'BTP00184',
        item_name: 'Eugica',
        lot_number: '0221126',
        from_date: '2026-11-28',
        to_date: '2026-11-28',
      }),
    ).resolves.toEqual({ data: rows, total: 26 });

    const query = findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({
      ipc_staff_approved_at: null,
      ipc_staff_approved_by_id: null,
      created_at: {
        gte: new Date('2026-11-27T17:00:00.000Z'),
        lt: new Date('2026-11-28T17:00:00.000Z'),
      },
      productionOrder: {
        is: {
          samplingRequests: { some: { status: 'sent' } },
          item_code: 'BTP00184',
          item: { is: { item_name: { contains: 'Eugica' } } },
          lot_no: { contains: '0221126' },
        },
      },
    });
    expect(query.where.AND[0].OR).toContainEqual({ id: 42 });
    if (kind === 'mixing') {
      expect(query.where.record_type).toBe('mixing');
    } else {
      expect(query.where).not.toHaveProperty('record_type');
    }
    expect(query.where).not.toHaveProperty('qa_staff_approved_at');
    expect(query).toMatchObject({
      skip: 25,
      take: 25,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: {
        productionOrder: {
          select: {
            samplingRequests: {
              take: 1,
              where: { status: 'sent' },
              orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
            },
          },
        },
      },
    });
    expect(count).toHaveBeenCalledWith({ where: query.where });
  });
});
