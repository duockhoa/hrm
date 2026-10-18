import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import { productionOrderScopeSql } from '../../access/production-order-scope';

export const analyticsText = (max = 100) => z.string().trim().min(1).max(max);
export const analyticsFields = {
  item_code: analyticsText().optional(),
  production_order_id: z.number().int().positive().max(2147483647).optional(),
  production_order_code: analyticsText().optional(),
  lot_no: analyticsText().optional(),
  status: analyticsText().optional(),
  warehouse: analyticsText().optional(),
  today: z.boolean().default(false),
  all_time: z.boolean().default(false),
  date_from: z.iso.date().optional(),
  date_to: z.iso.date().optional(),
  include_cancelled: z.boolean().default(false),
  page: z.number().int().min(1).max(1000000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
};
export type AnalyticsInput = z.output<z.ZodObject<typeof analyticsFields>>;
export function validateAnalyticsDates(
  input: AnalyticsInput,
  ctx: z.RefinementCtx,
) {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (input.today && (input.all_time || input.date_from || input.date_to))
    fail('today không kết hợp với all_time/date_from/date_to.');
  if (input.all_time && (input.date_from || input.date_to))
    fail('all_time không kết hợp với khoảng ngày.');
  if (!!input.date_from !== !!input.date_to)
    fail('Cần cả date_from và date_to.');
  if (input.date_from && input.date_to) {
    const days =
      (Date.parse(input.date_to) - Date.parse(input.date_from)) / 86400000;
    if (days < 0 || days > 365)
      fail(
        'Khoảng ngày phải theo thứ tự và không vượt quá 366 ngày. Dùng all_time để hỏi toàn bộ.',
      );
  }
}

export function analyticsPeriod(input: AnalyticsInput, now = new Date()) {
  const vietnamDay = new Date(now.getTime() + 25200000)
    .toISOString()
    .slice(0, 10);
  const to = input.all_time
    ? null
    : input.today
      ? vietnamDay
      : (input.date_to ?? vietnamDay);
  const from = input.all_time
    ? null
    : input.today
      ? vietnamDay
      : (input.date_from ??
        new Date(Date.parse(vietnamDay) - 29 * 86400000)
          .toISOString()
          .slice(0, 10));
  const start = from ? new Date(from + 'T00:00:00+07:00') : null;
  const end = to
    ? new Date(Date.parse(to + 'T00:00:00+07:00') + 86400000)
    : null;
  return {
    start,
    end,
    metadata: {
      timezone: 'Asia/Ho_Chi_Minh',
      mode: input.all_time
        ? 'all_time'
        : input.today
          ? 'today'
          : input.date_from
            ? 'custom'
            : 'last_30_days',
      date_from: from,
      date_to: to,
      from_inclusive: start?.toISOString() ?? null,
      to_exclusive: end?.toISOString() ?? null,
    },
  };
}

// Identifiers are selected only from static server catalogs, never client SQL.
export function analyticsIdentifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
    throw new Error('Invalid analytics identifier');
  return Prisma.raw('`' + value + '`');
}
export const analyticsColumn = (alias: string, field: string) =>
  Prisma.sql`${analyticsIdentifier(alias)}.${analyticsIdentifier(field)}`;
export const analyticsAnd = (clauses: Prisma.Sql[]) =>
  clauses.length ? Prisma.join(clauses, ' AND ') : Prisma.sql`1=1`;
export function requireAnalyticsPermissions(
  permissions: string[],
  required: string[],
) {
  if (required.some((permission) => !permissions.includes(permission)))
    throw new ForbiddenException(
      'Bạn không có quyền đọc dữ liệu thống kê được yêu cầu.',
    );
}

export const cancelledStatuses = [
  'boposcancelled',
  'boppcancelled',
  'cancelled',
  'c',
  'đã hủy',
  'đã huỷ',
  'hủy',
  'huỷ',
];
export const isCancelledSql = Prisma.sql`LOWER(TRIM(p.status)) IN (${Prisma.join(cancelledStatuses)})`;
export const productionStateSql = Prisma.sql`CASE
  WHEN ${isCancelledSql} THEN 'cancelled'
  WHEN LOWER(TRIM(p.status)) IN ('p','planned','boposplanned','boppplanned','đã lên kế hoạch') THEN 'planned'
  WHEN LOWER(TRIM(p.status)) IN ('r','released','boposreleased','boppreleased','đã phát hành') THEN 'released'
  WHEN LOWER(TRIM(p.status)) IN ('l','closed','boposclosed','boppclosed','đã đóng') THEN 'closed'
  ELSE 'other' END`;

export function analyticsOrderConditions(
  input: AnalyticsInput,
  date: Prisma.Sql,
  period: ReturnType<typeof analyticsPeriod>,
  orderIds?: number[] | null,
) {
  const conditions: Prisma.Sql[] = [];
  if (orderIds != null) conditions.push(productionOrderScopeSql(orderIds));
  for (const field of [
    'item_code',
    'production_order_code',
    'lot_no',
    'status',
    'warehouse',
  ] as const)
    if (input[field])
      conditions.push(
        Prisma.sql`${analyticsColumn('p', field)}=${input[field]}`,
      );
  if (input.production_order_id)
    conditions.push(Prisma.sql`p.id=${input.production_order_id}`);
  if (!input.include_cancelled)
    conditions.push(Prisma.sql`NOT (${isCancelledSql})`);
  if (period.start) conditions.push(Prisma.sql`${date}>=${period.start}`);
  if (period.end) conditions.push(Prisma.sql`${date}<${period.end}`);
  return conditions;
}

export function analyticsTimeBucket(
  date: Prisma.Sql,
  resolution: 'day' | 'month',
) {
  return resolution === 'day'
    ? Prisma.sql`DATE_FORMAT(DATE_ADD(${date}, INTERVAL 7 HOUR),'%Y-%m-%d')`
    : Prisma.sql`DATE_FORMAT(DATE_ADD(${date}, INTERVAL 7 HOUR),'%Y-%m')`;
}
export const normalizedUnitSql = (unit: Prisma.Sql) =>
  Prisma.sql`CAST(NULLIF(TRIM(${unit}),'') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_bin`;
export const productionUnitSql = (unit: Prisma.Sql) =>
  Prisma.sql`CASE WHEN LOWER(TRIM(${unit})) IN ('hộp','hop','box','boxes') THEN 'hộp' ELSE ${normalizedUnitSql(unit)} END`;

// MySQL returns DECIMAL and COUNT through different runtime types. Only convert
// aggregate scalars; identifiers and labels remain strings.
export function analyticsNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('Non-finite analytics result');
  return number;
}
export function decodeAnalyticsRow(
  row: Record<string, unknown>,
  numericFields: string[],
) {
  const result = { ...row };
  for (const key of numericFields) result[key] = analyticsNumber(row[key]);
  delete result.total_groups;
  delete result.has_group;
  return result;
}
export function analyticsPagination(
  input: AnalyticsInput,
  total: number,
  returned: number,
) {
  return {
    page: input.page,
    limit: input.limit,
    total_groups: total,
    total_pages: Math.ceil(total / input.limit),
    has_next_page: (input.page - 1) * input.limit + returned < total,
  };
}
