import { Prisma } from '@prisma/client';
import {
  buildWeighingSearch,
  weighingSearchSchema,
  weighingTotals,
} from './mcp-weighing-records';

describe('MCP weighing records', () => {
  it('distinguishes no entered weighings from an empty or created record', () => {
    const { where } = buildWeighingSearch(
      weighingSearchSchema.parse({ has_weights: false }),
    );
    expect(where.AND).toEqual([{ lines: { none: { details: { some: {} } } } }]);
  });

  it('combines exact order filters, text search and Vietnam day boundaries', () => {
    const { where, date_range } = buildWeighingSearch(
      weighingSearchSchema.parse({
        item_code: 'BTP01',
        production_order_code: 'LSX01',
        lot_no: 'LOT01',
        query: "x' OR 1=1 --",
        date_from: '2026-10-25',
        date_to: '2026-10-25',
      }),
    );
    expect(where.productionOrder).toEqual({
      is: {
        item_code: 'BTP01',
        production_order_code: 'LSX01',
        lot_no: 'LOT01',
      },
    });
    expect(where.OR).toContainEqual({
      description: { contains: "x' OR 1=1 --" },
    });
    expect(date_range).toMatchObject({
      from_inclusive: '2026-10-24T17:00:00.000Z',
      to_exclusive: '2026-10-25T17:00:00.000Z',
    });
  });

  it('keeps decimal totals precise across lots and negative adjustments, separating item and unit', () => {
    const rows = [
      {
        id: 1,
        item_code: 'A',
        unit: 'g',
        planned_quantity: new Prisma.Decimal('999999999999.999999'),
        details: [{ net_weight: new Prisma.Decimal('-0.000001'), unit: 'g' }],
      },
      {
        id: 2,
        item_code: 'A',
        unit: 'g',
        planned_quantity: new Prisma.Decimal('0.000001'),
        details: [
          { net_weight: new Prisma.Decimal('0.000001'), unit: 'g' },
          { net_weight: new Prisma.Decimal('2'), unit: 'kg' },
        ],
      },
      {
        id: 3,
        item_code: 'B',
        unit: 'g',
        planned_quantity: new Prisma.Decimal('1'),
        details: [],
      },
      {
        id: 4,
        item_code: 'A',
        unit: 'kg',
        planned_quantity: new Prisma.Decimal('1'),
        details: [],
      },
    ] as unknown as Parameters<typeof weighingTotals>[0];
    const totals = weighingTotals(rows);
    expect(totals).toHaveLength(3);
    expect(totals[0]).toEqual({
      item_code: 'A',
      unit: 'g',
      line_ids: [1, 2],
      required_quantity: '1000000000000',
      actual_quantities: [
        { unit: 'g', quantity: '0' },
        { unit: 'kg', quantity: '2' },
      ],
      weighing_count: 3,
    });
    expect(totals[1].actual_quantities).toEqual([]);
    expect(weighingTotals([])).toEqual([]);
  });
});
