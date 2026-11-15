import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import {
  connectionSearchSchema,
  connectionStatisticsSchema,
  buildConnectionSearch,
  buildConnectionStatistics,
  getConnectionStatistics,
  searchConnectionSessions,
} from './mcp-connection-history';

const now = new Date('2026-11-15T17:01:00.000Z');
const search = (input: object = {}) =>
  buildConnectionSearch(connectionSearchSchema.parse(input), now);
const stats = (input: object = {}) =>
  buildConnectionStatistics(connectionStatisticsSchema.parse(input), now);

describe('connection MCP queries', () => {
  it('defaults to EBR and 30 Vietnam calendar days, and has bounded pages', () => {
    const plan = search();
    expect(plan.period.metadata).toMatchObject({
      date_from: '2026-10-18',
      date_to: '2026-11-16',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    expect(plan.dataQuery.values).toContain('hsl');
    expect(plan.dataQuery.values.slice(-2)).toEqual([100, 0]);
  });
  it.each([
    { date_from: '2026-02-30', date_to: '2026-03-01' },
    { date_from: '2026-11-15', date_to: '2026-11-09' },
    { date_from: '2026-11-09' },
    { today: true, all_time: true },
    { all_time: true, date_from: '2026-11-09', date_to: '2026-11-15' },
    { date_from: '2025-01-01', date_to: '2026-11-15' },
    { limit: 301 },
    { page: 0 },
    { application_key: 'unknown' },
    { min_duration_seconds: 60, max_duration_seconds: 10 },
    { sort_by: 'id; DROP TABLE users' },
    { sql: 'SELECT * FROM users' },
  ])('rejects unsupported/unsafe filters %j', (input) => {
    expect(connectionSearchSchema.safeParse(input).success).toBe(false);
    expect(connectionStatisticsSchema.safeParse(input).success).toBe(false);
  });
  it('uses literal bound keyword and scopes both counts and rows to application/user/dates', () => {
    const input = {
      application_key: 'wms',
      user_id: 7,
      keyword: " x%' OR 1=1 -- ",
      date_from: '2026-11-09',
      date_to: '2026-11-15',
      page: 2,
      limit: 300,
    };
    const plan = search(input);
    for (const query of [plan.countQuery, plan.dataQuery]) {
      expect(query.sql).toContain('s.application_key=?');
      expect(query.sql).toContain('s.user_id=?');
      expect(query.sql).not.toContain('OR 1=1 --');
      expect(query.values).toEqual(
        expect.arrayContaining([
          'wms',
          7,
          new Date('2026-11-08T17:00:00Z'),
          new Date('2026-11-15T17:00:00Z'),
          "%x\\%' OR 1=1 --%",
        ]),
      );
    }
    expect(plan.dataQuery.values.slice(-2)).toEqual([300, 300]);
  });
  it('filters both known applications for all_time and omits date bounds', () => {
    const plan = stats({ application_key: 'all', all_time: true });
    expect(plan.period.start).toBeNull();
    expect(plan.summaryQuery.sql).toContain(
      "s.application_key IN ('hsl','wms')",
    );
    expect(plan.summaryQuery.sql).not.toContain('s.connected_at>=');
  });
  it('derives current status, clamps elapsed duration, and applies filters before aggregates', () => {
    const plan = stats({
      status: 'reconnecting',
      min_connection_count: 2,
      max_duration_seconds: 60,
    });
    expect(plan.summaryQuery.sql).toContain('s.ended_at IS NOT NULL');
    expect(plan.summaryQuery.sql).toContain('s.last_seen_at <= ?');
    expect(plan.summaryQuery.values).toContainEqual(
      new Date(now.getTime() - 60000),
    );
    expect(plan.summaryQuery.sql).toContain('GREATEST(0,TIMESTAMPDIFF');
    expect(plan.summaryQuery.sql).toContain('LEAST(');
    expect(plan.summaryQuery.sql).toContain(
      'COALESCE(s.disconnected_at,s.last_seen_at)',
    );
    expect(plan.summaryQuery.sql).toContain(
      'WHERE status=? AND connection_count>=? AND duration_seconds<=?',
    );
    expect(plan.summaryQuery.sql).toContain('COUNT(DISTINCT user_id)');
    expect(plan.summaryQuery.sql).toContain(
      'SUM(GREATEST(connection_count-1,0))',
    );
    expect(plan.summaryQuery.sql).not.toContain('LIMIT');
  });
  it.each([
    'none',
    'day',
    'hour',
    'user',
    'application',
    'status',
    'end_reason',
  ])('supports grouping %s without slicing input records', (group_by) => {
    const plan = stats({
      group_by,
      page: 3,
      limit: 20,
      sort_by: 'sessions_desc',
    });
    expect(plan.dataQuery.sql).toContain(
      'COUNT(*) AS total_groups FROM grouped',
    );
    expect(plan.dataQuery.sql).toContain('FROM selected GROUP BY');
    expect(plan.dataQuery.sql).toContain(
      'ORDER BY total_sessions DESC,group_key ASC LIMIT ? OFFSET ?',
    );
    expect(plan.dataQuery.values.slice(-2)).toEqual([20, 40]);
    if (group_by === 'hour')
      expect(plan.dataQuery.sql).toContain("INTERVAL 7 HOUR),'%Y-%m-%d %H:00'");
    if (group_by === 'user')
      expect(plan.dataQuery.sql).toContain('MAX(username)');
  });
  it('omits connection secrets and IP from default public projection', () => {
    const query = search().dataQuery.sql;
    const projection = query.slice(query.lastIndexOf('SELECT id,'));
    expect(projection).not.toContain('ip_address');
    expect(
      search({ include_ip: true }).dataQuery.sql.slice(
        query.lastIndexOf('SELECT id,'),
      ),
    ).toContain('ip_address');
    for (const key of [
      'active_key',
      'client_session_id',
      'connection_key',
      'socket_id',
      'user_agent',
    ])
      expect(query).not.toContain(key);
  });
});

describe('connection MCP results', () => {
  const query = jest.fn();
  const transaction = jest.fn((reads: Promise<unknown>[]) =>
    Promise.all(reads),
  );
  const prisma = {
    $queryRaw: query,
    $transaction: transaction,
  } as unknown as PrismaService;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('retains full summary and total groups on an out-of-range group page, serializing bigint/decimal', async () => {
    query
      .mockResolvedValueOnce([
        {
          total_sessions: 2306n,
          unique_users: 50n,
          average_duration_seconds: new Prisma.Decimal('60.5'),
        },
      ])
      .mockResolvedValueOnce([{ has_group: null, total_groups: 7n }]);
    const result = await getConnectionStatistics(
      prisma,
      connectionStatisticsSchema.parse({ page: 2, limit: 100 }),
    );
    expect(result).toMatchObject({
      summary: {
        total_sessions: 2306,
        unique_users: 50,
        average_duration_seconds: 60.5,
      },
      data: [],
      pagination: { total_groups: 7, has_next_page: false },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
  it('retains null end_reason groups and removes internal pagination markers', async () => {
    query
      .mockResolvedValueOnce([{ total_sessions: 5n }])
      .mockResolvedValueOnce([
        { group_key: null, total_sessions: 5n, total_groups: 1n, has_group: 1 },
      ]);
    const result = await getConnectionStatistics(
      prisma,
      connectionStatisticsSchema.parse({ group_by: 'end_reason' }),
    );
    expect(result.data[0]).toMatchObject({
      group_key: null,
      total_sessions: 5,
    });
    expect(result.data[0]).not.toHaveProperty('has_group');
    expect(result.data[0]).not.toHaveProperty('total_groups');
  });
  it('returns paginated safe session rows with definitions and current snapshot timestamp', async () => {
    query.mockResolvedValueOnce([{ total: 301n }]).mockResolvedValueOnce([
      {
        id: 7,
        user_id: 2,
        connection_count: 4,
        duration_seconds: 120n,
        reconnect_count: 3n,
      },
    ]);
    const result = await searchConnectionSessions(
      prisma,
      connectionSearchSchema.parse({ limit: 300 }),
    );
    expect(result).toMatchObject({
      data: [{ id: 7, duration_seconds: 120, reconnect_count: 3 }],
      pagination: { total: 301, has_next_page: true },
      date_range: { timezone: 'Asia/Ho_Chi_Minh' },
    });
    expect(result.definitions.duration_seconds).toBeTruthy();
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
