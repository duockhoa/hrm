import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AppConnectionSessionsService } from './app-connection-sessions.service';

describe('connection history cursor pagination', () => {
  const findMany = jest.fn();
  const count = jest.fn().mockResolvedValue(650);
  const service = new AppConnectionSessionsService({
    userAppSessions: { findMany, count },
    $transaction: (reads: Promise<unknown>[]) => Promise.all(reads),
  } as unknown as PrismaService);
  const at = new Date('2026-11-15T01:00:00.000Z');
  const row = (id: number) => ({
    id,
    connected_at: at,
    last_seen_at: at,
    ended_at: at,
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('takes one extra record and emits a boundary for the last returned row', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 301 }, (_, i) => row(650 - i)),
    );
    const result = await service.findAll('hsl', {
      pagination: 'cursor',
      page: 1,
      limit: 300,
    });
    expect(result.data).toHaveLength(300);
    expect(result.data[299].id).toBe(351);
    expect(result.meta.has_more).toBe(true);
    expect(
      JSON.parse(Buffer.from(result.meta.next_cursor!, 'base64url').toString()),
    ).toEqual({ id: 351, at: at.toISOString() });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 301,
        orderBy: [{ connected_at: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('skip');
  });

  it('uses a strict timestamp/id boundary with application, status and keyword filters', async () => {
    findMany.mockResolvedValue([row(350), row(349)]);
    const cursor = Buffer.from(
      JSON.stringify({ id: 351, at: at.toISOString() }),
    ).toString('base64url');
    const result = await service.findAll('wms', {
      pagination: 'cursor',
      cursor,
      page: 1,
      limit: 300,
      keyword: ' tester ',
      status: 'ended',
    });
    expect(findMany.mock.calls[0][0].where).toEqual({
      AND: [
        {
          AND: [
            {
              application_key: 'wms',
              user: {
                OR: ['name', 'username', 'email'].map((field) => ({
                  [field]: { contains: 'tester' },
                })),
              },
            },
            { ended_at: { not: null } },
          ],
        },
        {
          OR: [
            { connected_at: { lt: at } },
            { connected_at: at, id: { lt: 351 } },
          ],
        },
      ],
    });
    expect(result.meta).toMatchObject({
      has_more: false,
      next_cursor: null,
      total: 650,
    });
    // Counts cover the full filtered dataset, never only rows below the cursor.
    expect(JSON.stringify(count.mock.calls)).not.toContain('351');
  });

  it('ends an empty cursor page without another cursor', async () => {
    findMany.mockResolvedValue([]);
    expect(
      (
        await service.findAll('hsl', {
          pagination: 'cursor',
          page: 1,
          limit: 300,
        })
      ).meta,
    ).toMatchObject({ has_more: false, next_cursor: null });
  });

  it.each([
    'bad-token',
    Buffer.from(JSON.stringify({ id: -1, at: at.toISOString() })).toString(
      'base64url',
    ),
    Buffer.from(JSON.stringify({ id: 1, at: 'invalid' })).toString('base64url'),
  ])('rejects malformed cursor %s', async (cursor) => {
    await expect(
      service.findAll('hsl', {
        pagination: 'cursor',
        cursor,
        page: 1,
        limit: 300,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
