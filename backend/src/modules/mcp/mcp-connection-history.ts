import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import { PrismaService } from '../../prisma.service';
import { CONNECTED_THRESHOLD_MS } from '../app-connection-sessions/app-connection-sessions.service';
import {
  analyticsFields,
  validateAnalyticsDates,
  analyticsPeriod,
  analyticsAnd,
  decodeAnalyticsRow,
  analyticsNumber,
} from './mcp-analytics-common';
import { escapeLotSearch } from '../production-orders/production-order-list-query';

const fields = {
  application_key: z.enum(['hsl', 'wms', 'all']).default('hsl'),
  user_id: z.number().int().positive().max(2147483647).optional(),
  keyword: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['connected', 'reconnecting', 'ended']).optional(),
  min_connection_count: z.number().int().min(1).max(2147483647).optional(),
  min_duration_seconds: z.number().int().min(0).max(2147483647).optional(),
  max_duration_seconds: z.number().int().min(0).max(2147483647).optional(),
  today: analyticsFields.today,
  all_time: analyticsFields.all_time,
  date_from: analyticsFields.date_from,
  date_to: analyticsFields.date_to,
  page: analyticsFields.page,
  limit: z.number().int().min(1).max(300).default(100),
};
type CommonInput = z.output<z.ZodObject<typeof fields>>;
function validate(input: CommonInput, ctx: z.RefinementCtx) {
  validateAnalyticsDates({ ...input, include_cancelled: false }, ctx);
  if (
    input.min_duration_seconds !== undefined &&
    input.max_duration_seconds !== undefined &&
    input.min_duration_seconds > input.max_duration_seconds
  )
    ctx.addIssue({
      code: 'custom',
      message:
        'min_duration_seconds phải nhỏ hơn hoặc bằng max_duration_seconds.',
    });
}
export const connectionSearchSchema = z
  .object({
    ...fields,
    include_ip: z.boolean().default(false),
    sort_by: z
      .enum(['newest', 'duration_desc', 'reconnects_desc'])
      .default('newest'),
  })
  .strict()
  .superRefine(validate);
export const connectionStatisticsSchema = z
  .object({
    ...fields,
    group_by: z
      .enum([
        'none',
        'day',
        'hour',
        'user',
        'application',
        'status',
        'end_reason',
      ])
      .default('day'),
    sort_by: z
      .enum(['group', 'sessions_desc', 'reconnects_desc', 'duration_desc'])
      .default('group'),
  })
  .strict()
  .superRefine(validate);
export type ConnectionSearchInput = z.output<typeof connectionSearchSchema>;
export type ConnectionStatisticsInput = z.output<
  typeof connectionStatisticsSchema
>;

export function connectionQueryBase(input: CommonInput, now = new Date()) {
  const period = analyticsPeriod({ ...input, include_cancelled: false }, now);
  const cutoff = new Date(now.getTime() - CONNECTED_THRESHOLD_MS);
  const state = Prisma.sql`CASE WHEN s.ended_at IS NOT NULL THEN 'ended'
    WHEN s.disconnected_at IS NOT NULL OR s.last_seen_at <= ${cutoff} THEN 'reconnecting'
    ELSE 'connected' END`;
  const conditions: Prisma.Sql[] = [];
  if (input.application_key !== 'all')
    conditions.push(Prisma.sql`s.application_key=${input.application_key}`);
  else conditions.push(Prisma.sql`s.application_key IN ('hsl','wms')`);
  if (period.start)
    conditions.push(Prisma.sql`s.connected_at>=${period.start}`);
  if (period.end) conditions.push(Prisma.sql`s.connected_at<${period.end}`);
  if (input.user_id) conditions.push(Prisma.sql`s.user_id=${input.user_id}`);
  if (input.keyword) {
    const like = `%${escapeLotSearch(input.keyword)}%`;
    conditions.push(
      Prisma.sql`(u.name LIKE ${like} OR u.username LIKE ${like} OR u.email LIKE ${like})`,
    );
  }
  const post: Prisma.Sql[] = [];
  if (input.status) post.push(Prisma.sql`status=${input.status}`);
  if (input.min_connection_count !== undefined)
    post.push(Prisma.sql`connection_count>=${input.min_connection_count}`);
  if (input.min_duration_seconds !== undefined)
    post.push(Prisma.sql`duration_seconds>=${input.min_duration_seconds}`);
  if (input.max_duration_seconds !== undefined)
    post.push(Prisma.sql`duration_seconds<=${input.max_duration_seconds}`);
  const cte = Prisma.sql`base AS (
    SELECT s.id,s.application_key,s.user_id,u.username,u.name,s.connected_at,s.last_seen_at,
      s.disconnected_at,s.ended_at,s.end_reason,s.disconnect_reason,s.connection_count,s.ip_address,
      ${state} AS status,
      GREATEST(0,TIMESTAMPDIFF(SECOND,s.connected_at,
        LEAST(${now},COALESCE(s.ended_at,CASE WHEN (${state})='connected' THEN ${now}
          ELSE COALESCE(s.disconnected_at,s.last_seen_at) END)))) AS duration_seconds
    FROM user_app_sessions s INNER JOIN users u ON u.id=s.user_id
    WHERE ${analyticsAnd(conditions)}
  ), selected AS (SELECT * FROM base WHERE ${analyticsAnd(post)})`;
  return { cte, period, now };
}

const definitions = {
  session:
    'Một phiên ứng dụng/tab, không phải một người dùng hoặc một lần đăng nhập.',
  unique_users:
    'Số user_id khác nhau có phiên BẮT ĐẦU trong khoảng ngày đã lọc; không phải toàn bộ người thao tác trong ngày.',
  connection_count:
    'Tổng số lần kết nối trong các phiên; reconnect_count = tổng max(connection_count - 1, 0).',
  duration_seconds:
    'Thời gian từ mở phiên đến ended_at; phiên đang kết nối tính đến as_of, phiên chờ nối lại tính đến disconnected_at hoặc last_seen_at. Có thể gồm thời gian để tab mở và gián đoạn; không phải thời gian thao tác/năng suất.',
  status:
    'Trạng thái tại as_of, không phải trạng thái lịch sử tại ngày bắt đầu phiên. Ngưỡng heartbeat 60 giây như giao diện.',
  grouping:
    'Ngày/giờ tính theo lúc BẮT ĐẦU phiên, múi giờ Việt Nam; chỉ trả các nhóm có dữ liệu. Unique users giữa các nhóm không được cộng để suy ra tổng người dùng.',
  limitations:
    'Không ghi từng lần gián đoạn hoặc thao tác nghiệp vụ; không suy ra nguyên nhân lỗi mạng, người dùng đồng thời cao nhất hay số người đang thao tác từ dữ liệu này.',
};
function metadata(
  plan: ReturnType<typeof connectionQueryBase>,
  input: CommonInput,
) {
  return {
    source: 'user_app_sessions',
    application_key: input.application_key,
    date_range: plan.period.metadata,
    as_of: plan.now.toISOString(),
    definitions,
  };
}
const numericFields = [
  'total_sessions',
  'unique_users',
  'connected_sessions',
  'reconnecting_sessions',
  'ended_sessions',
  'total_connection_count',
  'reconnect_count',
  'sessions_with_reconnects',
  'total_duration_seconds',
  'average_duration_seconds',
  'max_duration_seconds',
  'short_sessions_under_60s',
];
const metrics = Prisma.sql`COUNT(*) AS total_sessions,COUNT(DISTINCT user_id) AS unique_users,
  COALESCE(SUM(status='connected'),0) AS connected_sessions,
  COALESCE(SUM(status='reconnecting'),0) AS reconnecting_sessions,
  COALESCE(SUM(status='ended'),0) AS ended_sessions,
  COALESCE(SUM(connection_count),0) AS total_connection_count,
  COALESCE(SUM(GREATEST(connection_count-1,0)),0) AS reconnect_count,
  COALESCE(SUM(connection_count>1),0) AS sessions_with_reconnects,
  COALESCE(SUM(duration_seconds),0) AS total_duration_seconds,
  AVG(duration_seconds) AS average_duration_seconds,MAX(duration_seconds) AS max_duration_seconds,
  COALESCE(SUM(duration_seconds<60),0) AS short_sessions_under_60s`;

export function buildConnectionStatistics(
  input: ConnectionStatisticsInput,
  now = new Date(),
) {
  const plan = connectionQueryBase(input, now);
  const key = {
    none: Prisma.sql`'all'`,
    day: Prisma.sql`DATE_FORMAT(DATE_ADD(connected_at,INTERVAL 7 HOUR),'%Y-%m-%d')`,
    hour: Prisma.sql`DATE_FORMAT(DATE_ADD(connected_at,INTERVAL 7 HOUR),'%Y-%m-%d %H:00')`,
    user: Prisma.sql`user_id`,
    application: Prisma.sql`application_key`,
    status: Prisma.sql`status`,
    end_reason: Prisma.sql`end_reason`,
  }[input.group_by];
  const grouped = Prisma.sql`grouped AS (SELECT ${key} AS group_key,
    ${input.group_by === 'user' ? Prisma.sql`MAX(username) AS username,MAX(name) AS name,` : Prisma.empty}
    ${metrics} FROM selected GROUP BY ${key})`;
  const order = {
    group: Prisma.sql`group_key ASC`,
    sessions_desc: Prisma.sql`total_sessions DESC,group_key ASC`,
    reconnects_desc: Prisma.sql`reconnect_count DESC,group_key ASC`,
    duration_desc: Prisma.sql`total_duration_seconds DESC,group_key ASC`,
  }[input.sort_by];
  return {
    ...plan,
    summaryQuery: Prisma.sql`WITH ${plan.cte} SELECT ${metrics} FROM selected`,
    dataQuery: Prisma.sql`WITH ${plan.cte},${grouped}
      SELECT g.*,t.total_groups FROM (SELECT COUNT(*) AS total_groups FROM grouped) t
      LEFT JOIN (SELECT *,1 AS has_group FROM grouped ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}) g ON 1=1
      ORDER BY ${order}`,
  };
}
export async function getConnectionStatistics(
  prisma: PrismaService,
  input: ConnectionStatisticsInput,
) {
  const plan = buildConnectionStatistics(input);
  const [summary, rows] = await prisma.$transaction(
    [
      prisma.$queryRaw<Record<string, unknown>[]>(plan.summaryQuery),
      prisma.$queryRaw<Record<string, unknown>[]>(plan.dataQuery),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const total = analyticsNumber(rows[0]?.total_groups) ?? 0;
  const data = rows
    .filter((row) => row.has_group != null)
    .map((row) => decodeAnalyticsRow(row, numericFields));
  return {
    ...metadata(plan, input),
    group_by: input.group_by,
    sort_by: input.sort_by,
    summary: decodeAnalyticsRow(summary[0] ?? {}, numericFields),
    data,
    pagination: {
      page: input.page,
      limit: input.limit,
      total_groups: total,
      total_pages: Math.ceil(total / input.limit),
      has_next_page: input.page * input.limit < total,
    },
  };
}

export function buildConnectionSearch(
  input: ConnectionSearchInput,
  now = new Date(),
) {
  const plan = connectionQueryBase(input, now);
  const order = {
    newest: Prisma.sql`connected_at DESC,id DESC`,
    duration_desc: Prisma.sql`duration_seconds DESC,id DESC`,
    reconnects_desc: Prisma.sql`connection_count DESC,id DESC`,
  }[input.sort_by];
  return {
    ...plan,
    countQuery: Prisma.sql`WITH ${plan.cte} SELECT COUNT(*) AS total FROM selected`,
    dataQuery: Prisma.sql`WITH ${plan.cte} SELECT id,application_key,user_id,username,name,connected_at,last_seen_at,
      disconnected_at,ended_at,end_reason,disconnect_reason,connection_count,status,duration_seconds,
      GREATEST(connection_count-1,0) AS reconnect_count ${input.include_ip ? Prisma.sql`,ip_address` : Prisma.empty}
      FROM selected ORDER BY ${order} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}`,
  };
}
export async function searchConnectionSessions(
  prisma: PrismaService,
  input: ConnectionSearchInput,
) {
  const plan = buildConnectionSearch(input);
  const [count, rows] = await prisma.$transaction(
    [
      prisma.$queryRaw<Record<string, unknown>[]>(plan.countQuery),
      prisma.$queryRaw<Record<string, unknown>[]>(plan.dataQuery),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  const total = analyticsNumber(count[0]?.total) ?? 0;
  return {
    ...metadata(plan, input),
    sort_by: input.sort_by,
    data: rows.map((row) =>
      decodeAnalyticsRow(row, [
        'id',
        'user_id',
        'connection_count',
        'duration_seconds',
        'reconnect_count',
      ]),
    ),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      total_pages: Math.ceil(total / input.limit),
      has_next_page: input.page * input.limit < total,
    },
  };
}
