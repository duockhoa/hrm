import {
  buildDeviationSearch,
  deviationSearchSchema,
} from './mcp-deviation-search';

describe('MCP deviation search dates', () => {
  it.each([
    [
      '2026-10-16T16:59:59Z',
      '2026-10-16',
      '2026-10-15T17:00:00.000Z',
      '2026-10-16T17:00:00.000Z',
    ],
    [
      '2026-10-16T17:00:00Z',
      '2026-10-17',
      '2026-10-16T17:00:00.000Z',
      '2026-10-17T17:00:00.000Z',
    ],
    [
      '2026-12-31T18:00:00Z',
      '2027-01-01',
      '2026-12-31T17:00:00.000Z',
      '2027-01-01T17:00:00.000Z',
    ],
  ])(
    'resolves today independently of host timezone at %s',
    (now, date, start, end) => {
      const result = buildDeviationSearch(
        deviationSearchSchema.parse({ today: true, mode: 'count' }),
        new Date(now),
      );
      expect(result.date_range).toMatchObject({
        date_from: date,
        date_to: date,
        from_inclusive: start,
        to_exclusive: end,
        timezone: 'Asia/Ho_Chi_Minh',
      });
      expect(result.where.created_at).toEqual({
        gte: new Date(start),
        lt: new Date(end),
      });
    },
  );

  it('includes all of the final calendar day, including fractional seconds', () => {
    const result = buildDeviationSearch(
      deviationSearchSchema.parse({
        date_from: '2024-02-28',
        date_to: '2024-02-29',
      }),
    );
    expect(result.where.created_at).toEqual({
      gte: new Date('2024-02-27T17:00:00Z'),
      lt: new Date('2024-02-29T17:00:00Z'),
    });
  });

  it.each([
    [{ date_from: '2026-10-17' }, { gte: new Date('2026-10-16T17:00:00Z') }],
    [{ date_to: '2026-10-17' }, { lt: new Date('2026-10-17T17:00:00Z') }],
  ])('supports open date ranges: %j', (input, expected) => {
    expect(
      buildDeviationSearch(deviationSearchSchema.parse(input)).where.created_at,
    ).toEqual(expected);
  });

  it('applies no implicit date range to current active deviations', () => {
    expect(
      buildDeviationSearch(deviationSearchSchema.parse({ mode: 'count' }))
        .where,
    ).toEqual({ deleted_at: null });
  });
});
