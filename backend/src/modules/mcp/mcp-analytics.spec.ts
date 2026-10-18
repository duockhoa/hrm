import { Prisma } from '@prisma/client';
import {
  analyticsPeriod,
  analyticsFields,
  analyticsNumber,
} from './mcp-analytics-common';
import {
  productionStatisticsSchema,
  buildProductionStatistics,
  productionStatisticMetrics,
  decodeProductionStatistics,
} from './mcp-production-statistics';
import {
  parameterAnalysisSchema,
  buildParameterAnalysis,
  parameterSources,
  decodeParameterAnalysis,
} from './mcp-parameter-analysis';
import { recordSections } from './mcp-record-sections';
import * as z from 'zod/v4';

const permissions = [
  'production-orders.list',
  'production-orders.read',
  ...Object.values(recordSections).map((config) => config.permission),
  'production-order-deviations.read',
];
const now = new Date('2026-10-17T17:01:00Z');
const stats = (input: object = {}) =>
  buildProductionStatistics(
    productionStatisticsSchema.parse(input),
    permissions,
    now,
  );
const parameter = (input: object = {}) =>
  buildParameterAnalysis(
    parameterAnalysisSchema.parse({
      source: 'mixing_records',
      parameter: 'pH',
      ...input,
    }),
    permissions,
    now,
  );

describe('MCP analytics validation and date semantics', () => {
  it('defaults to 30 Vietnamese calendar days including today', () => {
    const period = analyticsPeriod(z.object(analyticsFields).parse({}), now);
    expect(period.metadata).toMatchObject({
      mode: 'last_30_days',
      date_from: '2026-09-19',
      date_to: '2026-10-18',
      from_inclusive: '2026-09-18T17:00:00.000Z',
      to_exclusive: '2026-10-18T17:00:00.000Z',
    });
  });
  it('uses inclusive Vietnamese dates and explicitly supports all time', () => {
    expect(stats({ today: true }).date_range).toMatchObject({
      date_from: '2026-10-18',
      date_to: '2026-10-18',
      from_inclusive: '2026-10-17T17:00:00.000Z',
    });
    expect(
      parameter({ date_from: '2024-01-01', date_to: '2024-12-31' }).date_range,
    ).toMatchObject({ date_from: '2024-01-01', date_to: '2024-12-31' });
    expect(stats({ all_time: true }).date_range.from_inclusive).toBeNull();
    expect(stats({ all_time: true }).countQuery.sql).not.toContain(
      'start_date>=',
    );
  });
  it.each([
    { today: true, all_time: true },
    { today: true, date_from: '2026-10-01', date_to: '2026-10-18' },
    { all_time: true, date_from: '2026-10-01', date_to: '2026-10-18' },
    { date_from: '2026-10-01' },
    { date_from: '2026-02-30', date_to: '2026-03-01' },
    { date_from: '2026-10-02', date_to: '2026-10-01' },
    { date_from: '2025-01-01', date_to: '2026-01-02' },
    { limit: 101 },
    { page: 0 },
    { sql: 'SELECT * FROM users' },
  ])('rejects ambiguous/unbounded options %j', (input) => {
    expect(productionStatisticsSchema.safeParse(input).success).toBe(false);
    expect(
      parameterAnalysisSchema.safeParse({
        source: 'mixing_records',
        parameter: 'pH',
        ...input,
      }).success,
    ).toBe(false);
  });
});

describe('MCP parameter analysis', () => {
  it.each(Object.entries(parameterSources))(
    'validates all %s identifiers against the Prisma numeric schema',
    (key, config) => {
      const model = Prisma.dmmf.datamodel.models.find(
        (model) => model.name === config.model,
      )!;
      for (const [name, measure] of Object.entries(config.parameters)) {
        expect(
          parameterAnalysisSchema.safeParse({ source: key, parameter: name })
            .success,
        ).toBe(true);
        const plan = parameter({ source: key, parameter: name });
        expect(plan.dataQuery.sql).toContain(model.dbName!);
        for (const field of measure.fields)
          expect(['Decimal', 'Int', 'Float']).toContain(
            model.fields.find((entry) => entry.name === field)?.type,
          );
        expect(
          model.fields.some((field) => field.name === config.dateField),
        ).toBe(true);
      }
    },
  );
  it.each([
    { source: 'unknown' },
    { source: 'density_checks', parameter: 'password' },
    { source: 'density_checks', parameter: 'density', qa_status: 'approved' },
    { source: 'density_checks', parameter: 'density', context: 'room' },
    { source: 'mixing_records', context: 'room' },
  ])(
    'rejects unsupported sources, metrics and cross-source filters %j',
    (input) => {
      expect(
        parameterAnalysisSchema.safeParse({
          source: 'mixing_records',
          parameter: 'pH',
          ...input,
        }).success,
      ).toBe(false);
    },
  );
  it('requires the source permission as well as order list/read', () => {
    const input = parameterAnalysisSchema.parse({
      source: 'steam_sterilization_checks',
      parameter: 'setting_temperature',
    });
    expect(() =>
      buildParameterAnalysis(input, [
        'production-orders.list',
        'production-orders.read',
      ]),
    ).toThrow('quyền');
    expect(() =>
      buildParameterAnalysis(
        parameterAnalysisSchema.parse({
          source: 'mixing_records',
          parameter: 'pH',
        }),
        ['production-orders.read'],
      ),
    ).toThrow('quyền');
  });
  it('filters and separates saved parameter context without interpolating user text', () => {
    const injection = "pH' OR 1=1 --";
    const plan = parameter({
      parameter: injection,
      stage_name: 'Pha chế',
      step_name: 'Bước 1',
      template_version: 'v1',
      record_type: 'mixing',
      qa_status: 'approved',
      ipc_status: 'pending',
      unit: 'M',
      date_field: 'recorded_at',
      group_by: 'production_order',
    });
    expect(plan.dataQuery.sql).not.toContain(injection);
    expect(plan.dataQuery.values).toEqual(
      expect.arrayContaining([
        injection,
        'Pha chế',
        'Bước 1',
        'v1',
        'mixing',
        'M',
      ]),
    );
    expect(plan.dataQuery.sql).toContain('utf8mb4_bin');
    expect(plan.dataQuery.sql).toContain(
      'r.`qa_staff_approved_by_id`'.replace('r.', '`r`.'),
    );
    expect(plan.dataQuery.sql).toContain(
      'COALESCE(mp.recorded_at,r.created_at)',
    );
    expect(plan.dataQuery.sql).toContain(
      "data_type NOT IN ('number','decimal')",
    );
    expect(plan.dataQuery.sql).toContain("WHEN text_value='' THEN 'missing'");
    expect(plan.dataQuery.sql).toContain('COUNT(DISTINCT order_id)');
    expect(plan.dataQuery.sql).toContain(
      'GROUP BY group_key,item_code,unit,record_type,template_version,stage_name,step_name,context',
    );
  });
  it('decodes weighted measurements without turning absent averages into zero', () => {
    const plan = parameter({ limit: 2, page: 2 });
    const result = decodeParameterAnalysis(
      plan,
      [
        {
          order_count: 2n,
          record_count: 3n,
          slot_count: 5n,
          measurement_count: 3n,
          missing_count: 1n,
          invalid_count: 1n,
          non_numeric_type_count: 0n,
          valid_order_count: 2n,
        },
      ],
      [
        {
          has_group: 1,
          total_groups: 4n,
          item_code: 'BTP0001',
          average_value: new Prisma.Decimal('6.25'),
          min_value: '6',
          max_value: '6.5',
          population_stddev: '0.25',
          measurement_count: 2n,
          order_count: 1n,
          slot_count: 2n,
          record_count: 1n,
          valid_order_count: 1n,
          missing_count: 0n,
          invalid_count: 0n,
          non_numeric_type_count: 0n,
          production_order_id: null,
        },
        {
          has_group: 1,
          total_groups: 4n,
          item_code: 'BTP0002',
          average_value: null,
          min_value: null,
          max_value: null,
          population_stddev: null,
        },
      ],
    );
    expect(result.summary).toMatchObject({
      order_count: 2,
      measurement_count: 3,
      missing_count: 1,
      invalid_count: 1,
    });
    expect(result.data[0]).toMatchObject({
      average_value: 6.25,
      measurement_count: 2,
      production_order_id: null,
    });
    expect(result.data[1].average_value).toBeNull();
    expect(result.pagination).toMatchObject({
      total_groups: 4,
      total_pages: 2,
      has_next_page: false,
    });
    expect(result.aggregation).toBe('measurement_weighted');
    expect(() => JSON.stringify(result)).not.toThrow();
  });
  it('retains group totals for an out-of-range page and reports empty coverage truthfully', () => {
    const result = decodeParameterAnalysis(
      parameter({ page: 9 }),
      [],
      [{ has_group: null, total_groups: 3n }],
    );
    expect(result.data).toEqual([]);
    expect(result.summary.measurement_count).toBe(0);
    expect(result.pagination.total_groups).toBe(3);
    expect(analyticsNumber(null)).toBeNull();
    expect(() => analyticsNumber(Infinity)).toThrow();
  });
});

describe('MCP production statistics', () => {
  it('only computes explicitly selected metrics; default does not read child tables', () => {
    const plan = stats();
    expect(plan.queries.map((query) => query.metric)).toEqual(['orders']);
    expect(plan.queries[0].query.sql).not.toMatch(/JOIN production_order_/);
    expect(plan.queries[0].query.sql).not.toContain('result_value');
  });
  it.each(productionStatisticMetrics)(
    'builds bounded aggregate-only queries for %s',
    (metric) => {
      const plan = stats({
        metrics: [metric],
        item_code: 'BTP0001',
        group_by: 'month',
        limit: 20,
        page: 2,
      });
      expect(plan.queries).toHaveLength(1);
      expect(plan.queries[0].query.sql).toContain('selected_orders AS');
      expect(plan.queries[0].query.sql).toContain(
        'SELECT COUNT(*) AS total_groups FROM grouped',
      );
      expect(plan.queries[0].query.values.slice(-2)).toEqual([20, 20]);
      expect(plan.queries[0].query.values).toContain('BTP0001');
    },
  );
  it('prevents cross-table fanout and chooses only the latest PYCLM', () => {
    const plan = stats({ metrics: ['pyclm', 'deviations', 'finished_output'] });
    expect(plan.queries[0].query.sql).toContain(
      'ORDER BY s.sent_at DESC,s.id DESC LIMIT 1',
    );
    expect(plan.queries[1].query.sql).toContain('COUNT(DISTINCT p.id)');
    expect(plan.queries[1].query.sql).toContain('d.deleted_at IS NULL');
    expect(plan.queries[2].query.sql).toContain(
      'GROUP BY s.production_order_id',
    );
    expect(plan.queries[2].query.sql).not.toContain('sampling_requests');
  });
  it('keeps quantities separated by stage/kind/unit and applies TP-only output rules', () => {
    const plan = stats({
      metrics: [
        'semi_finished_quantities',
        'packaging_pending',
        'finished_output',
      ],
    });
    expect(plan.queries[0].query.sql).toContain(
      'GROUP BY q.group_key,q.stage,q.quantity_kind,q.unit',
    );
    expect(plan.queries[0].query.sql).toContain(
      'q.quantity>=0 AND q.unit IS NOT NULL',
    );
    expect(plan.queries[0].query.sql).toContain('missing_unit_count');
    expect(plan.queries[1].query.sql).toContain(
      "UPPER(p.item_code) LIKE 'TP%'",
    );
    expect(plan.queries[2].query.sql).toContain('comparable_planned_quantity');
    expect(plan.queries[2].query.sql).toContain(
      "UPPER(p.item_code) LIKE 'TP%'",
    );
  });
  it('requires extra read permissions before building sensitive report queries', () => {
    for (const metric of ['deviations', 'packaging_pending'])
      expect(() =>
        buildProductionStatistics(
          productionStatisticsSchema.parse({ metrics: [metric] }),
          ['production-orders.list', 'production-orders.read'],
        ),
      ).toThrow('quyền');
  });
  it('decodes distinct order and record totals, quantities and page metadata', () => {
    const result = decodeProductionStatistics(
      stats({ metrics: ['orders', 'finished_output'] }),
      [{ matched_orders: 3n }],
      [
        [
          {
            has_group: 1,
            total_groups: 1n,
            group_key: 'all',
            order_count: 3n,
            planned_count: 1n,
            released_count: 2n,
            closed_count: 0n,
            cancelled_count: 0n,
            other_count: 0n,
          },
        ],
        [
          {
            has_group: 1,
            total_groups: 1n,
            group_key: 'all',
            planned_unit: 'hộp',
            output_unit: 'hộp',
            actual_quantity: new Prisma.Decimal('135'),
            planned_quantity: 150,
            achievement_percent: '90',
            order_count: 2n,
          },
        ],
      ],
    );
    expect(result.matched_orders).toBe(3);
    expect(result.reports.orders.data[0].order_count).toBe(3);
    expect(result.reports.finished_output.data[0]).toMatchObject({
      actual_quantity: 135,
      planned_quantity: 150,
      achievement_percent: 90,
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
  it.each([
    { metrics: [] },
    { metrics: ['orders', 'orders'] },
    {
      metrics: [
        'orders',
        'pyclm',
        'document_control',
        'deviations',
        'vial_defects',
      ],
    },
    { metrics: ['sql'] },
    { group_by: 'password' },
  ])('rejects unsupported or excessive metric requests %j', (input) => {
    expect(productionStatisticsSchema.safeParse(input).success).toBe(false);
  });
});
