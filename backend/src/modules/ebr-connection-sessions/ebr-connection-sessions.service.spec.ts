import { BadRequestException } from '@nestjs/common';
import type { UserEbrSessions } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { EbrConnectionSessionsService } from './ebr-connection-sessions.service';

// State-backed delegate lets lifecycle tests exercise reconnects and conditional
// updates in sequence, including delayed events from superseded sockets.
describe('EBR connection session lifecycle', () => {
  let service: EbrConnectionSessionsService;
  let rows: UserEbrSessions[];
  type Where = { OR?: Where[] } & Record<string, unknown>;
  type Snapshot = Pick<
    UserEbrSessions,
    'id' | 'connection_key' | 'last_seen_at' | 'disconnected_at'
  >;
  type UpsertArgs = {
    where: Where;
    create: Partial<UserEbrSessions>;
    update: Partial<Omit<UserEbrSessions, 'connection_count'>> & {
      connection_count: { increment: number };
    };
  };
  const matches = (row: UserEbrSessions, where: Where): boolean => {
    if (where.OR && !where.OR.some((part) => matches(row, part))) return false;
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return true;
      const actual = row[key as keyof UserEbrSessions];
      if (value instanceof Date)
        return actual instanceof Date && actual.getTime() === value.getTime();
      if (value && typeof value === 'object' && 'lte' in value)
        return (
          actual instanceof Date &&
          value.lte instanceof Date &&
          actual <= value.lte
        );
      return actual === value;
    });
  };
  const delegate = {
    findMany: jest.fn<Promise<Snapshot[]>, [{ where: Where; take: number }]>(),
    upsert: jest.fn<Promise<UserEbrSessions>, [UpsertArgs]>(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [{ where: Where; data: Partial<UserEbrSessions> }]
    >(),
    count: jest.fn(),
  };
  const prisma = {
    userEbrSessions: delegate,
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  };
  const clientId = '0464244a-e11a-4e03-9e41-f6c7309b125c';
  const metadata = {
    socketId: 'socket-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test',
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-07T01:00:00Z'));
    jest.clearAllMocks();
    rows = [];
    delegate.findMany.mockImplementation(({ where, take }) =>
      Promise.resolve(
        rows
          .filter((row) => matches(row, where))
          .slice(0, take)
          .map((row) => ({
            id: row.id,
            connection_key: row.connection_key,
            last_seen_at: row.last_seen_at,
            disconnected_at: row.disconnected_at,
          })),
      ),
    );
    delegate.upsert.mockImplementation(({ where, create, update }) => {
      let row = rows.find((item) => matches(item, where));
      if (row) {
        const count = row.connection_count;
        Object.assign(row, update, {
          connection_count: count + update.connection_count.increment,
        });
      } else {
        row = {
          id: rows.length + 1,
          ended_at: null,
          end_reason: null,
          connection_count: 1,
          ...create,
        } as UserEbrSessions;
        rows.push(row);
      }
      return Promise.resolve({ ...row });
    });
    delegate.updateMany.mockImplementation(({ where, data }) => {
      const selected = rows.filter((row) => matches(row, where));
      selected.forEach((row) => Object.assign(row, data));
      return Promise.resolve({ count: selected.length });
    });
    delegate.count.mockResolvedValue(0);
    service = new EbrConnectionSessionsService(
      prisma as unknown as PrismaService,
    );
  });
  afterEach(() => jest.useRealTimers());

  it('keeps a short reconnect in the same session and ignores a delayed old disconnect', async () => {
    const first = await service.connect(1, clientId, metadata);
    const started = first.connected_at;
    await service.disconnect(
      { id: first.id, connection_key: first.connection_key },
      'transport close',
    );
    jest.advanceTimersByTime(60_000);
    const second = await service.connect(1, clientId, { socketId: 'socket-2' });
    await service.disconnect(
      { id: first.id, connection_key: first.connection_key },
      'ping timeout',
    );
    expect(second.id).toBe(first.id);
    expect(second.connected_at).toEqual(started);
    expect(rows[0]).toMatchObject({
      disconnected_at: null,
      ended_at: null,
      connection_count: 2,
      socket_id: 'socket-2',
    });
    expect(
      await service.touch({
        id: first.id,
        connection_key: first.connection_key,
      }),
    ).toBe(false);
  });

  it('creates a new historical row after the reconnect grace period', async () => {
    const first = await service.connect(1, clientId, metadata);
    const disconnectedAt = new Date();
    await service.disconnect(
      { id: first.id, connection_key: first.connection_key },
      'transport close',
    );
    jest.advanceTimersByTime(90_001);
    const second = await service.connect(1, clientId, metadata);
    expect(second.id).not.toBe(first.id);
    expect(rows[0]).toMatchObject({
      active_key: null,
      ended_at: disconnectedAt,
      end_reason: 'connection_lost',
    });
    expect(rows[1].ended_at).toBeNull();
  });

  it('recovers sessions orphaned by server failure using the last confirmed heartbeat', async () => {
    const session = await service.connect(1, clientId, metadata);
    jest.advanceTimersByTime(25_000);
    await service.touch({
      id: session.id,
      connection_key: session.connection_key,
    });
    const lastSeen = new Date();
    jest.advanceTimersByTime(120_001);
    await service.sweepExpiredSessions();
    expect(rows[0]).toMatchObject({
      active_key: null,
      ended_at: lastSeen,
      end_reason: 'connection_lost',
    });
  });

  it('does not expire a connection refreshed while the stale snapshot was being read', async () => {
    const session = await service.connect(1, clientId, metadata);
    jest.advanceTimersByTime(120_001);
    const original = delegate.findMany.getMockImplementation()!;
    delegate.findMany.mockImplementationOnce(async (args) => {
      const snapshot = await original(args);
      await service.touch({
        id: session.id,
        connection_key: session.connection_key,
      });
      return snapshot;
    });
    await service.expireSessions();
    expect(rows[0].ended_at).toBeNull();
  });

  it('separates tabs and users, and logout only ends the current user and tab', async () => {
    await service.connect(1, clientId, metadata);
    await service.connect(2, clientId, metadata);
    await service.connect(1, 'c0a13ded-ae34-4d0e-bfa8-79b87b06b848', metadata);
    await service.end(1, clientId);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      active_key: null,
      end_reason: 'logout',
      ended_at: new Date(),
    });
    expect(rows[1].ended_at).toBeNull();
    expect(rows[2].ended_at).toBeNull();
    expect((await service.connect(1, clientId, metadata)).id).toBe(4);
  });

  it('filters Vietnam calendar days, including the entire end date, and paginates', async () => {
    delegate.findMany.mockResolvedValue([]);
    const result = await service.findAll({
      page: 2,
      limit: 20,
      keyword: ' tester ',
      status: 'connected',
      connected_from: '2026-11-01',
      connected_to: '2026-11-07',
    });
    expect(delegate.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: {
          AND: [
            expect.objectContaining({
              connected_at: {
                gte: new Date('2026-10-31T17:00:00Z'),
                lt: new Date('2026-11-07T17:00:00Z'),
              },
              user: {
                OR: [
                  { name: { contains: 'tester' } },
                  { username: { contains: 'tester' } },
                  { email: { contains: 'tester' } },
                ],
              },
            }),
            expect.objectContaining({ ended_at: null, disconnected_at: null }),
          ],
        },
      }),
    );
    expect(result.meta).toMatchObject({ page: 2, limit: 20 });
  });

  it.each([
    { connected_from: '2026-02-30' },
    { connected_from: '2026-11-08', connected_to: '2026-11-07' },
  ])('rejects invalid dates or reversed ranges', async (filter) => {
    await expect(
      service.findAll({ page: 1, limit: 20, ...filter }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
