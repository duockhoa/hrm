import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GetProductionOrderDeviationsDto } from '../../modules/production-order-deviations/dto/get-production-order-deviations.dto';
import { productionOrderDeviationListWhere } from '../../modules/production-order-deviations/production-order-deviation-list-query';
import { GetProductionOrderDateChecksDto } from '../../modules/production-orders/dto/get-production-order-date-checks.dto';
import { productionOrderDateCheckListWhere } from '../../modules/production-orders/production-order-date-check-list-query';
import {
  literalContains,
  recordDateRange,
  recordPagination,
  recordSearchTerms,
  searchDocumentId,
} from './record-list-query';

const pipe = new ValidationPipe({ transform: true, whitelist: true });
const parse = (
  value: unknown,
  metatype:
    | typeof GetProductionOrderDeviationsDto
    | typeof GetProductionOrderDateChecksDto,
) => pipe.transform(value, { type: 'query', metatype });

describe.each([
  GetProductionOrderDeviationsDto,
  GetProductionOrderDateChecksDto,
])('%s query validation', (dto) => {
  it('normalizes Unicode, trims input and parses pagination/order IDs', async () => {
    expect(
      await parse(
        {
          search: '  lo\u0302 001  ',
          item_code: ' TP001 ',
          production_order_id: '2031',
          page: '2',
          limit: '20',
        },
        dto,
      ),
    ).toMatchObject({
      search: 'lô 001',
      item_code: 'TP001',
      production_order_id: 2031,
      page: 2,
      limit: 20,
    });
    expect((await parse({}, dto)).page).toBeUndefined();
    expect(
      (await parse({ production_order_id: '' }, dto)).production_order_id,
    ).toBeUndefined();
  });

  it.each([
    { search: ['a', 'b'] },
    { search: { contains: 'a' } },
    { search: 'a'.repeat(201) },
    { page: '0' },
    { page: '1.2' },
    { page: 'Infinity' },
    { page: '1000001' },
    { limit: '201' },
    { limit: '' },
    { item_code: ['TP1', 'TP2'] },
    { production_order_id: '0' },
    { production_order_id: '2147483648' },
    { production_order_id: ['1', '2'] },
    { from_date: '2026-02-30' },
    { to_date: '2026-11-14T01:00:00Z' },
    { date_field: 'deleted_at' },
  ])('rejects malformed input %j', async (value) => {
    await expect(parse(value, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('shared record search and pagination', () => {
  it('ignores blanks, deduplicates tokens and bounds search complexity', () => {
    expect(recordSearchTerms(' \t\n ')).toEqual([]);
    expect(recordSearchTerms(' lô\t001\nlô ')).toEqual(['lô', '001']);
    expect(() => recordSearchTerms('a b c d e f g h i j k')).toThrow(
      BadRequestException,
    );
    expect(literalContains('A_10%\\B')).toEqual({ contains: 'A\\_10\\%\\\\B' });
    expect(searchDocumentId('0002031')).toBe(2031);
    expect(searchDocumentId('2147483648')).toBeUndefined();
    expect(searchDocumentId('20.31')).toBeUndefined();
  });

  it('supports inclusive bounds and rejects reversed ranges', () => {
    expect(
      recordDateRange({ from_date: '2026-11-14', to_date: '2026-11-14' }),
    ).toEqual({
      gte: new Date('2026-11-14T00:00:00Z'),
      lt: new Date('2026-11-15T00:00:00Z'),
    });
    expect(recordDateRange({ to_date: '2026-12-31' })).toEqual({
      lt: new Date('2027-01-01T00:00:00Z'),
    });
    expect(recordDateRange({ from_date: '2026-11-14' })).toEqual({
      gte: new Date('2026-11-14T00:00:00Z'),
    });
    expect(() =>
      recordDateRange({ from_date: '2026-11-15', to_date: '2026-11-14' }),
    ).toThrow(BadRequestException);
  });

  it('only enables pagination on explicit page/limit', () => {
    expect(recordPagination({})).toMatchObject({ enabled: false, args: {} });
    expect(recordPagination({ page: 2 })).toEqual({
      enabled: true,
      page: 2,
      limit: 50,
      args: { skip: 50, take: 50 },
    });
    expect(recordPagination({ limit: 20 })).toEqual({
      enabled: true,
      page: 1,
      limit: 20,
      args: { skip: 0, take: 20 },
    });
  });
});

describe('deviation list search', () => {
  it('combines terms across deviation content, lot, product and users while excluding deleted rows', () => {
    const where = productionOrderDeviationListWhere({ search: 'aspirin 001' });
    expect(where.deleted_at).toBeNull();
    const clauses = where.AND as any[];
    expect(clauses).toHaveLength(2);
    expect(clauses[0].OR).toEqual(
      expect.arrayContaining([
        { deviation_content: { contains: 'aspirin' } },
        { handling_plan: { contains: 'aspirin' } },
        { handling_result: { contains: 'aspirin' } },
        { cause: { contains: 'aspirin' } },
        { cause_classification: { contains: 'aspirin' } },
        {
          reporter: {
            is: expect.objectContaining({
              OR: expect.arrayContaining([{ name: { contains: 'aspirin' } }]),
            }),
          },
        },
        { approver: { is: expect.any(Object) } },
      ]),
    );
    expect(clauses[1].OR).toContainEqual({ id: 1 });
    const lot = clauses[1].OR.find((value) => value.productionOrder)
      .productionOrder.is;
    expect(lot.OR).toEqual(
      expect.arrayContaining([
        { id: 1 },
        { lot_no: { contains: '001' } },
        { production_order_code: { contains: '001' } },
        { item_code: { contains: '001' } },
        { item: { is: { item_name: { contains: '001' } } } },
      ]),
    );
  });

  it('adds exact filters and chosen date field independently of search', () => {
    expect(
      productionOrderDeviationListWhere({
        production_order_id: 2031,
        reporter_id: 7,
        approver_id: 8,
        cause_classification: 'Thiết bị',
        item_code: 'TP1',
        date_field: 'updated_at',
        to_date: '2026-11-14',
      }),
    ).toEqual({
      production_order_id: 2031,
      deleted_at: null,
      reporter_id: 7,
      approver_id: 8,
      cause_classification: 'Thiết bị',
      productionOrder: { is: { item_code: 'TP1' } },
      updated_at: { lt: new Date('2026-11-15T00:00:00Z') },
    });
  });
});

describe('date check list search', () => {
  it('searches multiple words across package, approval, lot and creator/approver', () => {
    const where = productionOrderDateCheckListWhere({ search: 'aspirin 001' });
    const clauses = where.AND as any[];
    expect(clauses).toHaveLength(2);
    expect(clauses[0].OR).toEqual(
      expect.arrayContaining([
        { package_type: { contains: 'aspirin' } },
        { approval_status: { contains: 'aspirin' } },
        { createdBy: { is: expect.any(Object) } },
        { approvedBy: { is: expect.any(Object) } },
        { productionOrder: { is: expect.any(Object) } },
      ]),
    );
    expect(clauses[1].OR).toContainEqual({ id: 1 });
  });

  it.each(['Đã duyệt', 'da duyet'])(
    'supports displayed Vietnamese status labels: %s',
    (search) => {
      const clauses = productionOrderDateCheckListWhere({ search })
        .AND as any[];
      expect(clauses).toHaveLength(2);
      for (const clause of clauses)
        expect(clause.OR).toContainEqual({
          approval_status: { in: expect.arrayContaining(['approved']) },
        });
    },
  );

  it('supports package labels and literal SQL wildcard characters', () => {
    const clauses = productionOrderDateCheckListWhere({
      search: 'túi nhôm 10%_',
    }).AND as any[];
    expect(clauses[0].OR).toContainEqual({
      package_type: { in: ['tui_nhom'] },
    });
    expect(clauses[1].OR).toContainEqual({
      package_type: { in: ['tui_nhom'] },
    });
    expect(clauses[2].OR).toContainEqual({
      package_type: { contains: '10\\%\\_' },
    });
  });

  it('adds exact filters, image presence and approval date bounds', () => {
    expect(
      productionOrderDateCheckListWhere({
        production_order_id: 2031,
        item_code: 'TP1',
        approval_status: 'approved',
        package_type: 'hop',
        created_by_id: 7,
        approved_by_id: 8,
        has_images: 'false',
        date_field: 'approved_at',
        from_date: '2026-11-14',
      }),
    ).toEqual({
      production_order_id: 2031,
      productionOrder: { is: { item_code: 'TP1' } },
      approval_status: 'approved',
      package_type: 'hop',
      created_by_id: 7,
      approved_by_id: 8,
      images: { none: {} },
      approved_at: { gte: new Date('2026-11-14T00:00:00Z') },
    });
  });

  it.each([
    { approval_status: 'sent' },
    { has_images: 'yes' },
    { created_by_id: '0' },
    { approved_by_id: '-1' },
    { package_type: ['hop', 'goi'] },
  ])('validates date check filters %j', async (query) => {
    await expect(
      parse(query, GetProductionOrderDateChecksDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
