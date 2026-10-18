import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import {
  analyticsFields,
  validateAnalyticsDates,
  analyticsPeriod,
  analyticsOrderConditions,
  analyticsAnd,
  analyticsColumn,
  analyticsTimeBucket,
  productionStateSql,
  productionUnitSql,
  requireAnalyticsPermissions,
  analyticsNumber,
  decodeAnalyticsRow,
  analyticsPagination,
} from './mcp-analytics-common';
import { PRODUCTION_ORDER_PERMISSIONS as P } from '../production-orders/production-orders.permissions';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS as D } from '../production-order-deviations/production-order-deviations.permissions';

export const productionStatisticMetrics = [
  'orders',
  'pyclm',
  'document_control',
  'deviations',
  'finished_output',
  'semi_finished_quantities',
  'packaging_pending',
  'vial_defects',
] as const;
export const productionStatisticsSchema = z
  .object({
    ...analyticsFields,
    metrics: z
      .array(z.enum(productionStatisticMetrics))
      .min(1)
      .max(4)
      .default(['orders'])
      .refine(
        (keys) => new Set(keys).size === keys.length,
        'metrics không được trùng.',
      ),
    group_by: z
      .enum(['none', 'day', 'month', 'item_code', 'status', 'warehouse'])
      .default('none'),
    date_field: z.enum(['start_date', 'creation_date']).default('start_date'),
    category: z.enum(['all', 'finished', 'semi']).default('all'),
  })
  .strict()
  .superRefine(validateAnalyticsDates);
export type ProductionStatisticsInput = z.output<
  typeof productionStatisticsSchema
>;

type Metric = (typeof productionStatisticMetrics)[number];
type ReportQuery = {
  metric: Metric;
  query: Prisma.Sql;
  numericFields: string[];
};

export function buildProductionStatistics(
  input: ProductionStatisticsInput,
  permissions: string[],
  now = new Date(),
  orderIds?: number[] | null,
) {
  requireAnalyticsPermissions(permissions, [
    P.LIST,
    P.READ,
    ...(input.metrics.includes('deviations') ? [D.READ] : []),
    ...(input.metrics.includes('packaging_pending')
      ? [P.POST_SECONDARY_PACKAGING_SUMMARY_READ]
      : []),
  ]);
  const period = analyticsPeriod(input, now);
  const date = analyticsColumn('p', input.date_field);
  const conditions = analyticsOrderConditions(input, date, period, orderIds);
  if (input.category !== 'all')
    conditions.push(
      input.category === 'finished'
        ? Prisma.sql`UPPER(p.item_code) LIKE 'TP%'`
        : Prisma.sql`UPPER(p.item_code) NOT LIKE 'TP%'`,
    );
  const key =
    input.group_by === 'none'
      ? Prisma.sql`'all'`
      : input.group_by === 'day' || input.group_by === 'month'
        ? analyticsTimeBucket(date, input.group_by)
        : input.group_by === 'status'
          ? productionStateSql
          : analyticsColumn('p', input.group_by);
  const selected = Prisma.sql`selected_orders AS (SELECT p.id,p.item_code,p.production_order_code,p.lot_no,p.status,p.warehouse,p.planned_quatity,p.unit,
    ${productionStateSql} AS production_state,${key} AS group_key FROM production_orders p WHERE ${analyticsAnd(conditions)})`;
  const queries: ReportQuery[] = [];
  const add = (
    metric: Metric,
    grouped: Prisma.Sql,
    numericFields: string[],
    order: Prisma.Sql = Prisma.sql`group_key`,
  ) => {
    // A totals row is retained even when the requested page has no groups.
    // Aggregate CTEs prevent child-table joins from multiplying order totals.
    queries.push({
      metric,
      numericFields,
      query: Prisma.sql`WITH ${selected}, grouped AS (${grouped})
      SELECT g.*,t.total_groups FROM (SELECT COUNT(*) AS total_groups FROM grouped) t
      LEFT JOIN (SELECT * FROM grouped ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}) g ON 1=1`,
    });
  };
  for (const metric of input.metrics) {
    if (metric === 'orders') {
      const states = ['planned', 'released', 'closed', 'cancelled', 'other'];
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,COUNT(*) AS order_count,
        ${Prisma.join(states.map((state) => Prisma.sql`SUM(p.production_state=${state}) AS ${Prisma.raw(state + '_count')}`))}
        FROM selected_orders p GROUP BY p.group_key`,
        ['order_count', ...states.map((state) => state + '_count')],
      );
    } else if (metric === 'pyclm') {
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,COUNT(*) AS order_count,
        SUM(COALESCE(sr.status='sent',0)) AS sent_count,
        SUM(sr.id IS NULL OR sr.status<>'sent') AS not_sent_count,
        SUM(sr.id IS NULL) AS without_request_count,
        100.0*SUM(COALESCE(sr.status='sent',0))/COUNT(*) AS sent_percent
        FROM selected_orders p LEFT JOIN production_order_sampling_requests sr ON sr.id=(
          SELECT s.id FROM production_order_sampling_requests s WHERE s.production_order_id=p.id ORDER BY s.sent_at DESC,s.id DESC LIMIT 1)
        GROUP BY p.group_key`,
        [
          'order_count',
          'sent_count',
          'not_sent_count',
          'without_request_count',
          'sent_percent',
        ],
      );
    } else if (metric === 'document_control') {
      const fields = [
        'batch_record_issued_at',
        'batch_record_received_at',
        'test_certificate_received_at',
        'warehouse_release_received_at',
      ];
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,COUNT(*) AS order_count,
        ${Prisma.join(fields.map((field) => Prisma.sql`SUM(${analyticsColumn('dc', field)} IS NOT NULL) AS ${Prisma.raw(field.replace(/_at$/, '_count'))}`))}
        FROM selected_orders p LEFT JOIN production_order_document_controls dc ON dc.production_order_id=p.id AND dc.deleted_at IS NULL
        GROUP BY p.group_key`,
        [
          'order_count',
          ...fields.map((field) => field.replace(/_at$/, '_count')),
        ],
      );
    } else if (metric === 'deviations') {
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,COUNT(DISTINCT p.id) AS order_count,
        COUNT(d.id) AS deviation_count,COUNT(DISTINCT d.production_order_id) AS orders_with_deviations,
        COALESCE(SUM(d.id IS NOT NULL AND d.approver_id IS NULL),0) AS pending_approval_count,
        COALESCE(SUM(d.approver_id IS NOT NULL),0) AS approved_count
        FROM selected_orders p LEFT JOIN production_order_deviations d ON d.production_order_id=p.id AND d.deleted_at IS NULL
        GROUP BY p.group_key`,
        [
          'order_count',
          'deviation_count',
          'orders_with_deviations',
          'pending_approval_count',
          'approved_count',
        ],
      );
    } else if (metric === 'finished_output') {
      const valid = Prisma.sql`s.package_count>=0 AND s.boxes_per_package>=0 AND s.loose_box_count>=0`;
      const comparable = Prisma.sql`${productionUnitSql(Prisma.sql`p.unit`)}='hộp' AND p.planned_quatity>0 AND fs.actual_quantity IS NOT NULL`;
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,${productionUnitSql(Prisma.sql`p.unit`)} AS planned_unit,'hộp' AS output_unit,
        COUNT(*) AS order_count,SUM(fs.actual_quantity IS NOT NULL) AS orders_with_output,
        SUM(CASE WHEN p.planned_quatity>=0 AND ${productionUnitSql(Prisma.sql`p.unit`)} IS NOT NULL THEN p.planned_quatity END) AS planned_quantity,
        SUM(fs.actual_quantity) AS actual_quantity,COALESCE(SUM(fs.invalid_summary_count),0) AS invalid_summary_count,
        SUM(CASE WHEN ${comparable} THEN p.planned_quatity END) AS comparable_planned_quantity,
        SUM(CASE WHEN ${comparable} THEN fs.actual_quantity END) AS comparable_actual_quantity,
        100.0*SUM(CASE WHEN ${comparable} THEN fs.actual_quantity END)/NULLIF(SUM(CASE WHEN ${comparable} THEN p.planned_quatity END),0) AS achievement_percent
        FROM selected_orders p LEFT JOIN (
          SELECT s.production_order_id,SUM(CASE WHEN ${valid} THEN CAST(s.package_count AS DECIMAL(30,3))*s.boxes_per_package+s.loose_box_count END) AS actual_quantity,
          SUM(NOT (${valid})) AS invalid_summary_count
          FROM production_order_finished_product_summaries s JOIN selected_orders scoped ON scoped.id=s.production_order_id GROUP BY s.production_order_id
        ) fs ON fs.production_order_id=p.id WHERE UPPER(p.item_code) LIKE 'TP%'
        GROUP BY p.group_key,planned_unit`,
        [
          'order_count',
          'orders_with_output',
          'planned_quantity',
          'actual_quantity',
          'invalid_summary_count',
          'comparable_planned_quantity',
          'comparable_actual_quantity',
          'achievement_percent',
        ],
        Prisma.sql`group_key,planned_unit`,
      );
    } else if (metric === 'semi_finished_quantities') {
      const kinds = ['input', 'load', 'packed', 'leftover', 'waste'];
      const slots = Prisma.join(
        kinds.map((_, index) => Prisma.sql`SELECT ${index} AS slot`),
        ' UNION ALL ',
      );
      const pick = (suffix: string) =>
        Prisma.sql`CASE n.slot ${Prisma.join(
          kinds.map(
            (kind, index) =>
              Prisma.sql`WHEN ${index} THEN ${analyticsColumn('r', kind + suffix)}`,
          ),
          ' ',
        )} END`;
      add(
        metric,
        quantityAggregate(Prisma.sql`SELECT p.group_key,p.id AS order_id,r.id AS record_id,r.stage,
        CASE n.slot ${Prisma.join(
          kinds.map((kind, index) => Prisma.sql`WHEN ${index} THEN ${kind}`),
          ' ',
        )} END AS quantity_kind,
        ${productionUnitSql(pick('_unit'))} AS unit,${pick('_quantity')} AS quantity
        FROM selected_orders p JOIN production_order_semi_finished_product_summaries r ON r.production_order_id=p.id CROSS JOIN (${slots}) n`),
        quantityNumbers,
        Prisma.sql`group_key,stage,quantity_kind,unit`,
      );
    } else if (metric === 'packaging_pending') {
      const rows = Prisma.join(
        [
          [
            'pending_process',
            'production_order_post_secondary_pending_process_items',
            'pending_quantity',
          ],
          [
            'pending_cancellation',
            'production_order_post_secondary_pending_cancellation_items',
            'cancellation_quantity',
          ],
        ].map(
          ([
            kind,
            table,
            field,
          ]) => Prisma.sql`SELECT p.group_key,p.id AS order_id,r.id AS record_id,CAST(NULL AS CHAR) AS stage,
        ${kind} AS quantity_kind,${productionUnitSql(Prisma.sql`r.unit`)} AS unit,${analyticsColumn('r', field)} AS quantity
        FROM selected_orders p JOIN production_order_post_secondary_packaging_summaries ps ON ps.production_order_id=p.id
        JOIN ${Prisma.raw(table)} r ON r.summary_id=ps.id WHERE UPPER(p.item_code) LIKE 'TP%'`,
        ),
        ' UNION ALL ',
      );
      add(
        metric,
        quantityAggregate(rows),
        quantityNumbers,
        Prisma.sql`group_key,quantity_kind,unit`,
      );
    } else if (metric === 'vial_defects') {
      const fields = [
        'fiber_vial_count',
        'particulate_count',
        'damaged_count',
        'other_defect_count',
      ];
      const complete = analyticsAnd(
        fields.map((field) => Prisma.sql`${analyticsColumn('r', field)}>=0`),
      );
      const total = Prisma.join(
        fields.map(
          (field) =>
            Prisma.sql`CASE WHEN ${analyticsColumn('r', field)}>=0 THEN ${analyticsColumn('r', field)} ELSE 0 END`,
        ),
        ' + ',
      );
      add(
        metric,
        Prisma.sql`SELECT 1 AS has_group,p.group_key,COUNT(DISTINCT p.id) AS order_count,COUNT(*) AS record_count,
        SUM(${complete}) AS complete_record_count,SUM(NOT (${complete})) AS invalid_record_count,
        SUM(${total}) AS known_defect_count,SUM((${complete}) AND (${total})>0) AS records_with_defects,
        SUM((${complete}) AND (${total})=0) AS records_without_defects,
        ${Prisma.join(fields.map((field) => Prisma.sql`SUM(CASE WHEN ${analyticsColumn('r', field)}>=0 THEN ${analyticsColumn('r', field)} END) AS ${Prisma.raw(field)}`))}
        FROM selected_orders p JOIN production_order_vial_inspection_checks r ON r.production_order_id=p.id GROUP BY p.group_key`,
        [
          'order_count',
          'record_count',
          'complete_record_count',
          'invalid_record_count',
          'known_defect_count',
          'records_with_defects',
          'records_without_defects',
          ...fields,
        ],
      );
    }
  }
  return {
    input,
    date_range: { ...period.metadata, field: input.date_field },
    queries,
    countQuery: Prisma.sql`WITH ${selected} SELECT COUNT(*) AS matched_orders FROM selected_orders`,
  };
}

const quantityNumbers = [
  'order_count',
  'record_count',
  'quantity',
  'missing_quantity_count',
  'invalid_quantity_count',
  'missing_unit_count',
];
function quantityAggregate(rows: Prisma.Sql) {
  return Prisma.sql`SELECT 1 AS has_group,q.group_key,q.stage,q.quantity_kind,q.unit,COUNT(DISTINCT q.order_id) AS order_count,
    COUNT(*) AS record_count,SUM(CASE WHEN q.quantity>=0 AND q.unit IS NOT NULL THEN q.quantity END) AS quantity,
    SUM(q.quantity IS NULL) AS missing_quantity_count,SUM(COALESCE(q.quantity<0,0)) AS invalid_quantity_count,
    SUM(q.unit IS NULL AND q.quantity IS NOT NULL) AS missing_unit_count
    FROM (${rows}) q GROUP BY q.group_key,q.stage,q.quantity_kind,q.unit`;
}

export function decodeProductionStatistics(
  plan: ReturnType<typeof buildProductionStatistics>,
  matched: Record<string, unknown>[],
  results: Record<string, unknown>[][],
) {
  const reports = Object.fromEntries(
    plan.queries.map((report, index) => {
      const rows = results[index];
      const data = rows
        .filter((row) => Number(row.has_group) === 1)
        .map((row) => decodeAnalyticsRow(row, report.numericFields));
      const total = analyticsNumber(rows[0]?.total_groups) ?? 0;
      return [
        report.metric,
        {
          data,
          pagination: analyticsPagination(plan.input, total, data.length),
        },
      ];
    }),
  );
  return {
    date_range: plan.date_range,
    group_by: plan.input.group_by,
    include_cancelled: plan.input.include_cancelled,
    category: plan.input.category,
    matched_orders: analyticsNumber(matched[0]?.matched_orders) ?? 0,
    reports,
  };
}
