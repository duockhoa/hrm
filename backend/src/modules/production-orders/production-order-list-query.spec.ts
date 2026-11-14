import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GetProductionOrderListDto } from './dto/get-production-order-list.dto';
import {
  escapeLotSearch,
  productionOrderListWhere,
} from './production-order-list-query';

const pipe = new ValidationPipe({ transform: true, whitelist: true });
const parse = (value: unknown): Promise<GetProductionOrderListDto> =>
  pipe.transform(value, {
    type: 'query',
    metatype: GetProductionOrderListDto,
  });

describe('lot list query validation and search', () => {
  it('normalizes Vietnamese Unicode, trims input and parses optional pagination', async () => {
    const query = await parse({
      search: '  Lô\u0300   001  ',
      page: '2',
      limit: '20',
    });
    expect(query).toMatchObject({ search: 'Lồ   001', page: 2, limit: 20 });
    expect((await parse({})).page).toBeUndefined();
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { page: 'Infinity' },
    { page: '1000001' },
    { limit: '201' },
    { limit: '' },
    { search: ['a', 'b'] },
    { search: { contains: 'a' } },
    { search: 'a'.repeat(201) },
    { status: ['sent', 'pending'] },
    { from_date: '2026-02-30' },
    { to_date: '2026-01-01T12:00:00Z' },
    { date_field: 'remarks' },
  ])('rejects invalid query %j', async (query) => {
    await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses AND between words and OR across fields, regardless of word order', () => {
    const where = productionOrderListWhere(true, {
      search: '  aspirin\t001\naspirin  ',
    });
    const clauses = where.AND as any[];
    expect(clauses).toHaveLength(2);
    expect(clauses[0].OR).toContainEqual({
      item: { is: { item_name: { contains: 'aspirin' } } },
    });
    expect(clauses[0].OR).toContainEqual({
      description: { contains: 'aspirin' },
    });
    expect(clauses[1].OR).toContainEqual({ lot_no: { contains: '001' } });
    expect(clauses[1].OR).toContainEqual({
      production_order_code: { contains: '001' },
    });
    expect(clauses[1].OR).toContainEqual({ item_code: { contains: '001' } });
    expect(clauses[1].OR).toContainEqual({ id: 1 });
  });

  it('treats wildcard characters and backslashes literally', () => {
    expect(escapeLotSearch('A_10%\\B')).toBe('A\\_10\\%\\\\B');
    expect(productionOrderListWhere(false, { search: '100%' }).AND).toEqual([
      { OR: expect.arrayContaining([{ lot_no: { contains: '100\\%' } }]) },
    ]);
  });

  it('ignores blank search and rejects excessive terms', () => {
    expect(productionOrderListWhere(true, { search: ' \n\t ' })).toEqual({
      item_code: { startsWith: 'TP' },
    });
    expect(() =>
      productionOrderListWhere(true, { search: 'a b c d e f g h i j k' }),
    ).toThrow(BadRequestException);
  });

  it('keeps the lot category restriction when exact item/status filters are added', () => {
    expect(
      productionOrderListWhere(false, {
        item_code: 'TP01',
        status: 'boposReleased',
      }),
    ).toEqual({
      item_code: { not: { startsWith: 'TP' } },
      AND: [{ item_code: 'TP01' }, { status: 'boposReleased' }],
    });
  });

  it('includes the entire last day and supports one-sided date ranges', () => {
    expect(
      productionOrderListWhere(true, {
        from_date: '2026-11-01',
        to_date: '2026-11-14',
      }).AND,
    ).toEqual([
      {
        creation_date: {
          gte: new Date('2026-11-01T00:00:00Z'),
          lt: new Date('2026-11-15T00:00:00Z'),
        },
      },
    ]);
    expect(
      productionOrderListWhere(true, {
        date_field: 'start_date',
        to_date: '2026-12-31',
      }).AND,
    ).toEqual([{ start_date: { lt: new Date('2027-01-01T00:00:00Z') } }]);
    expect(
      productionOrderListWhere(true, {
        date_field: 'date_manufacture',
        from_date: '2026-11-01',
        to_date: '2026-11-01',
      }).AND,
    ).toEqual([{ date_manufacture: { gte: '2026-11-01', lt: '2026-11-02' } }]);
    expect(() =>
      productionOrderListWhere(true, {
        from_date: '2026-11-15',
        to_date: '2026-11-14',
      }),
    ).toThrow(BadRequestException);
  });
});
