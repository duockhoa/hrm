import {
  buildOrderSearch,
  orderSearchSchema,
  orderSearchGroups,
  orderSearchMetadataQuery,
  decodeOrderSearchMetadata,
} from './mcp-order-search';

const allPermissions = [
  ...new Set([
    'production-orders.read',
    ...Object.values(orderSearchGroups).map((group) => group.permission),
  ]),
];
const plan = (input: object) =>
  buildOrderSearch(orderSearchSchema.parse(input), allPermissions);

describe('MCP order search planner', () => {
  it('keeps default queries free of extra relations and metadata', () => {
    const result = plan({});
    expect(result.where).toEqual({});
    expect(result.includes).toEqual([]);
    expect(result.counts).toEqual([]);
    expect(result.requiresSql).toBe(false);
    expect(result.fromSql.sql).not.toContain('JOIN');
  });

  it('combines all basic filters without overwriting exact item code with prefix', () => {
    expect(
      plan({
        item_code: 'TP1',
        code_prefix: 'tp',
        production_order_code: 'LSX1',
        type: 'S',
        warehouse: 'KHO1',
        status: 'R',
        query: 'abc',
      }).where,
    ).toMatchObject({
      item_code: 'TP1',
      production_order_code: 'LSX1',
      type: 'S',
      warehouse: 'KHO1',
      status: 'R',
      AND: [{ item_code: { startsWith: 'TP' } }],
      OR: expect.arrayContaining([{ lot_no: { contains: 'abc' } }]),
    });
  });

  it.each(Object.entries(orderSearchGroups))(
    'scopes presence and count to the correct relation for %s',
    (key, group) => {
      const result = plan({ presence: { [key]: false }, counts: [key] });
      expect(result.where.AND).toEqual([
        expect.objectContaining({
          NOT: expect.objectContaining({
            [group.relation]: expect.any(Object),
          }),
        }),
      ]);
      const query = orderSearchMetadataQuery(result, [7]);
      expect(query.query.sql).toContain('`' + group.table + '`');
      expect(query.query.values).toContain(7);
      expect(
        query.columns.some(
          (column) => column.group === 'counts' && column.key === key,
        ),
      ).toBe(true);
    },
  );

  it('excludes deleted documents, deviations and equipment records, and requires files for attachments', () => {
    const result = plan({
      batch_record_received: false,
      presence: {
        deviations: true,
        equipment_monitoring_records: true,
        attachments: true,
      },
    });
    expect(result.where.AND).toEqual(
      expect.arrayContaining([
        {
          NOT: {
            documentControl: {
              is: { deleted_at: null, batch_record_received_at: { not: null } },
            },
          },
        },
        { deviations: { some: { deleted_at: null } } },
        { equipmentMonitoringRecords: { some: { deleted_at: null } } },
        { attachments: { some: { files: { some: {} } } } },
      ]),
    );
  });

  it.each([
    ['creation_date', '2026-10-17T16:59:59Z', '2026-10-16T17:00:00.000Z'],
    ['start_date', '2026-10-17T17:00:00Z', '2026-10-17T17:00:00.000Z'],
    [
      'batch_record_received_at',
      '2026-10-17T17:00:00Z',
      '2026-10-17T17:00:00.000Z',
    ],
  ] as const)('uses Vietnamese days for %s', (field, now, start) => {
    // Both UTC instants below fall on 17/18 October in Vietnam respectively.
    const result = buildOrderSearch(
      orderSearchSchema.parse({ today: true, date_field: field }),
      allPermissions,
      new Date(now),
    );
    expect(result.date_range.from_inclusive).toBe(start);
    expect(result.date_range.to_exclusive).toBe(
      new Date(Date.parse(start) + 86400000).toISOString(),
    );
  });

  it('uses the latest PYCLM with a stable timestamp/ID order before testing sent status', () => {
    const result = plan({
      pyclm_sent: false,
      pyclm_sender_id: 5,
      pyclm_location: 'X1',
      date_field: 'pyclm_sent_at',
      date_from: '2026-10-18',
    });
    expect(result.requiresSql).toBe(true);
    expect(result.fromSql.sql).toContain(
      'ORDER BY s.sent_at DESC,s.id DESC LIMIT 1',
    );
    expect(result.fromSql.sql).not.toContain("status='sent'");
    expect(result.whereSql.sql).toContain("sr.status<>'sent'");
    expect(result.whereSql.values).toEqual(
      expect.arrayContaining([5, 'X1', new Date('2026-10-17T17:00:00Z')]),
    );
  });

  it('keeps all user text parameterized on the SQL filtering path', () => {
    const injection = "x' OR 1=1 --";
    const result = plan({
      pyclm_sent: true,
      item_code: injection,
      query: injection,
      registration_number: injection,
    });
    expect(result.whereSql.sql).not.toContain(injection);
    expect(result.whereSql.values).toContain(injection);
    expect(result.whereSql.values).toContain('%' + injection + '%');
  });

  it('distinguishes created mixing records from records with entered results', () => {
    const result = plan({
      mixing_record_type: 'mixing',
      mixing_qa_status: 'approved',
      mixing_ipc_status: 'pending',
      mixing_has_results: false,
    });
    expect(result.requiresSql).toBe(true);
    expect(result.where.AND).toContainEqual({
      mixingRecords: {
        some: {
          record_type: 'mixing',
          qa_staff_approved_by_id: { not: null },
          ipc_staff_approved_by_id: null,
        },
      },
    });
    expect(result.whereSql.sql).toContain('NOT (EXISTS');
    expect(result.whereSql.sql).toContain('result_value REGEXP');
    expect(result.whereSql.sql).not.toContain('mp.note');
  });

  it('returns booleans, numeric counts and safe metadata without exposing internal aliases', () => {
    const result = plan({
      include: ['date_checks', 'document_control'],
      counts: ['deviations'],
    });
    const query = orderSearchMetadataQuery(result, [7, 8]);
    const row: Record<string, unknown> = { id: 7 };
    for (const column of query.columns)
      row[column.alias] =
        column.kind === 'boolean' ? 1n : column.kind === 'number' ? 3n : null;
    const decoded = decodeOrderSearchMetadata(row, query.columns);
    expect(decoded.date_checks).toMatchObject({
      has_data: true,
      has_pending: true,
      has_approved: true,
      has_rejected: true,
    });
    expect(decoded.counts).toEqual({ deviations: 3 });
    expect(query.query.sql).not.toContain('result_value');
    expect(query.query.sql).not.toContain(
      'JOIN production_order_sampling_requests',
    );
  });

  it('enforces read permission even for negative filters and counts', () => {
    for (const input of [
      { has_date_checks: false },
      { include: ['pyclm'] },
      { counts: ['deviations'] },
      { presence: { steam_sterilization_checks: false } },
    ]) {
      expect(() =>
        buildOrderSearch(orderSearchSchema.parse(input), [
          'production-orders.list',
        ]),
      ).toThrow('không có quyền');
    }
  });

  it.each([
    { presence: { production_order_lines: true } },
    { include: ['material_summaries'] },
    { today: true, date_from: '2026-10-18' },
    { date_from: '2026-10-19', date_to: '2026-10-18' },
    { date_from: '2026-02-30' },
    { date_field: 'date_manufacture' },
    { has_date_checks: true, presence: { date_checks: false } },
    { include: ['pyclm', 'pyclm'] },
    { counts: Array(7).fill('date_checks') },
  ])('rejects invalid/unsupported search options: %j', (input) =>
    expect(orderSearchSchema.safeParse(input).success).toBe(false),
  );
});
