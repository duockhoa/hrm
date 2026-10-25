import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import { recordSections } from './mcp-record-sections';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';

const read = 'production-orders.read';
type Group = {
  relation: string;
  table: string;
  dateField: string;
  singleton: boolean;
  permission: string;
};
const models = Prisma.dmmf.datamodel.models;
const orderModel = models.find((model) => model.name === 'ProductionOrders')!;
// Table identifiers are derived only from the server's fixed relation registry.
export const orderSearchGroups: Record<string, Group> = Object.fromEntries(
  Object.entries(recordSections).map(([key, config]) => {
    const relation = orderModel.fields.find(
      (field) => field.name === config.relation,
    )!;
    const model = models.find((entry) => entry.name === relation.type)!;
    return [
      key,
      {
        relation: config.relation,
        table: model.dbName ?? model.name,
        dateField: config.dateField,
        singleton: config.singleton,
        permission: config.permission,
      },
    ];
  }),
);
Object.assign(orderSearchGroups, {
  weighing_records: {
    relation: 'weighingRecords',
    table: 'production_order_weighing_records',
    dateField: 'created_at',
    singleton: false,
    permission: read,
  },
  mixing_records: {
    relation: 'mixingRecords',
    table: 'production_order_mixing_records',
    dateField: 'created_at',
    singleton: false,
    permission: read,
  },
  deviations: {
    relation: 'deviations',
    table: 'production_order_deviations',
    dateField: 'created_at',
    singleton: false,
    permission: PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
  },
  production_guide: {
    relation: 'productionGuide',
    table: 'production_order_production_guides',
    dateField: 'updated_at',
    singleton: true,
    permission: read,
  },
} satisfies Record<string, Group>);
const groupKeys = Object.keys(orderSearchGroups) as [string, ...string[]];
const groupSchema = z.enum(groupKeys);
const includeSchema = z.enum([
  ...groupKeys,
  'document_control',
  'pyclm',
  'registration',
] as [string, ...string[]]);
const text = () => z.string().trim().min(1).max(100).optional();
const id = () => z.number().int().positive().max(2147483647).optional();
const approval = () => z.enum(['approved', 'pending']).optional();
const documentFields = {
  batch_record_issued: 'batch_record_issued_at',
  batch_record_received: 'batch_record_received_at',
  test_certificate_received: 'test_certificate_received_at',
  warehouse_release_received: 'warehouse_release_received_at',
} as const;
const actorFields = [
  'batch_record_issued_by_id',
  'batch_record_received_by_id',
  'test_certificate_received_by_id',
  'warehouse_release_received_by_id',
] as const;
const dateFields = [
  'creation_date',
  'start_date',
  ...Object.values(documentFields),
  'pyclm_sent_at',
] as const;
export const orderSearchSchema = z
  .object({
    query: text(),
    item_code: text(),
    code_prefix: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-zA-Z]+$/)
      .optional(),
    production_order_code: text(),
    lot_no: text(),
    status: text(),
    type: text(),
    warehouse: text(),
    today: z.boolean().default(false),
    date_field: z.enum(dateFields).default('creation_date'),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    batch_record_issued: z.boolean().optional(),
    batch_record_received: z.boolean().optional(),
    test_certificate_received: z.boolean().optional(),
    warehouse_release_received: z.boolean().optional(),
    batch_record_issued_by_id: id(),
    batch_record_received_by_id: id(),
    test_certificate_received_by_id: id(),
    warehouse_release_received_by_id: id(),
    pyclm_sent: z.boolean().optional(),
    pyclm_sender_id: id(),
    pyclm_location: text(),
    has_saved_registration: z.boolean().optional(),
    has_current_registration: z.boolean().optional(),
    registration_number: text(),
    has_production_guide: z.boolean().optional(),
    has_date_checks: z.boolean().optional(),
    presence: z
      .partialRecord(groupSchema, z.boolean())
      .optional()
      .refine(
        (value) => !value || Object.keys(value).length <= 10,
        'Tối đa 10 nhóm presence mỗi lần.',
      ),
    date_check_status: z.enum(['pending', 'approved', 'rejected']).optional(),
    attachment_status: z.enum(['pending', 'approved', 'rejected']).optional(),
    attachment_requires_approval: z.boolean().optional(),
    attachment_type: text(),
    mixing_record_type: text(),
    mixing_qa_status: approval(),
    mixing_ipc_status: approval(),
    mixing_has_results: z.boolean().optional(),
    weighing_status: z
      .enum(['draft', 'in_progress', 'completed', 'approved', 'cancelled'])
      .optional(),
    weighing_qa_status: approval(),
    weighing_ipc_status: approval(),
    weighing_has_weights: z.boolean().optional(),
    sampling_type: text(),
    semi_finished_summary_stage: text(),
    material_process_stage: text(),
    has_factory_release_approver: z.boolean().optional(),
    deviation_approval_status: approval(),
    include: z
      .array(includeSchema)
      .max(12)
      .default([])
      .refine(
        (keys) => new Set(keys).size === keys.length,
        'include không được trùng.',
      ),
    counts: z
      .array(groupSchema)
      .max(6)
      .default([])
      .refine(
        (keys) => new Set(keys).size === keys.length,
        'counts không được trùng.',
      ),
    page: z.number().int().min(1).max(1000000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (input) => !input.today || !(input.date_from || input.date_to),
    'today không đi cùng date_from/date_to.',
  )
  .refine(
    (input) =>
      !input.date_from || !input.date_to || input.date_from <= input.date_to,
    'date_from phải nhỏ hơn hoặc bằng date_to.',
  )
  .refine(
    (input) =>
      input.has_production_guide === undefined ||
      input.presence?.production_guide === undefined ||
      input.has_production_guide === input.presence.production_guide,
    'Bộ lọc production_guide bị mâu thuẫn.',
  )
  .refine(
    (input) =>
      input.has_date_checks === undefined ||
      input.presence?.date_checks === undefined ||
      input.has_date_checks === input.presence.date_checks,
    'Bộ lọc date_checks bị mâu thuẫn.',
  );
export type OrderSearchInput = z.output<typeof orderSearchSchema>;

function ident(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))
    throw new Error('Invalid server-side SQL identifier');
  return Prisma.raw('`' + value + '`');
}
const col = (alias: string, key: string) =>
  Prisma.sql`${ident(alias)}.${ident(key)}`;
const andSql = (items: Prisma.Sql[]) =>
  items.length ? Prisma.join(items, ' AND ') : Prisma.sql`1=1`;
const not = (value: Prisma.Sql) => Prisma.sql`NOT (${value})`;
const hasEnteredValue = Prisma.sql`EXISTS (
  SELECT 1 FROM production_order_mixing_record_stages ms
  JOIN production_order_mixing_record_steps mt ON mt.production_order_mixing_record_stage_id=ms.id
  JOIN production_order_mixing_record_parameters mp ON mp.production_order_mixing_record_step_id=mt.id
  WHERE ms.production_order_mixing_record_id=r.id AND
  (mp.result_value REGEXP '[^[:space:]]' OR mp.result_image_path REGEXP '[^[:space:]]')
)`;
const hasWeighingWeights = Prisma.sql`EXISTS (
  SELECT 1 FROM production_order_weighing_record_lines wl
  JOIN production_order_weighing_record_details wd ON wd.production_order_weighing_record_line_id=wl.id
  WHERE wl.production_order_weighing_record_id=r.id
)`;

function groupConditions(key: string, input: OrderSearchInput) {
  const prisma: Record<string, unknown> = {};
  const sql: Prisma.Sql[] = [];
  const eq = (field: string, value: string | boolean) => {
    prisma[field] = value;
    sql.push(Prisma.sql`${col('r', field)}=${value}`);
  };
  if (key === 'deviations' || key === 'equipment_monitoring_records') {
    prisma.deleted_at = null;
    sql.push(Prisma.sql`r.deleted_at IS NULL`);
  }
  if (key === 'attachments') {
    prisma.files = { some: {} };
    sql.push(
      Prisma.sql`EXISTS (SELECT 1 FROM production_order_attachment_files f WHERE f.attachment_id=r.id)`,
    );
    if (input.attachment_type) eq('attachment_type', input.attachment_type);
  }
  if (key === 'mixing_records' && input.mixing_record_type)
    eq('record_type', input.mixing_record_type);
  if (key === 'weighing_records' && input.weighing_status)
    eq('status', input.weighing_status);
  if (key === 'sampling_records' && input.sampling_type)
    eq('sampling_type', input.sampling_type);
  if (
    key === 'semi_finished_product_summaries' &&
    input.semi_finished_summary_stage
  )
    eq('stage', input.semi_finished_summary_stage);
  if (key === 'material_process_summaries' && input.material_process_stage)
    eq('process_stage', input.material_process_stage);
  return { prisma, sql };
}

function existsSql(
  key: string,
  input: OrderSearchInput,
  extra: Prisma.Sql[] = [],
) {
  const group = orderSearchGroups[key];
  return Prisma.sql`EXISTS (SELECT 1 FROM ${ident(group.table)} r WHERE r.production_order_id=p.id AND ${andSql([...groupConditions(key, input).sql, ...extra])})`;
}

export function buildOrderSearch(
  input: OrderSearchInput,
  permissions: string[],
  now = new Date(),
) {
  const where: Prisma.ProductionOrdersWhereInput = {};
  const clauses: Prisma.ProductionOrdersWhereInput[] = [];
  const sql: Prisma.Sql[] = [];
  const includes = new Set(input.include);
  const counts = new Set(input.counts);
  let requiresSql = false;
  const requireRead = (permission = read) => {
    if (!permissions.includes(permission))
      throw new ForbiddenException(
        'Bạn không có quyền lọc hoặc đọc nhóm dữ liệu này.',
      );
  };
  const use = (key: string) => {
    requireRead(orderSearchGroups[key]?.permission ?? read);
    includes.add(key);
  };
  for (const key of [...includes, ...counts])
    requireRead(orderSearchGroups[key]?.permission ?? read);
  for (const field of [
    'item_code',
    'production_order_code',
    'lot_no',
    'status',
    'type',
    'warehouse',
  ] as const) {
    if (input[field]) {
      where[field] = input[field];
      sql.push(Prisma.sql`${col('p', field)}=${input[field]}`);
    }
  }
  if (input.code_prefix) {
    clauses.push({
      item_code: { startsWith: input.code_prefix.toUpperCase() },
    });
    sql.push(
      Prisma.sql`p.item_code LIKE ${input.code_prefix.toUpperCase() + '%'}`,
    );
  }
  if (input.query) {
    where.OR = [
      { production_order_code: { contains: input.query } },
      { item_code: { contains: input.query } },
      { lot_no: { contains: input.query } },
      { item: { item_name: { contains: input.query } } },
    ];
    const pattern = '%' + input.query + '%';
    sql.push(Prisma.sql`(p.production_order_code LIKE ${pattern} OR p.item_code LIKE ${pattern} OR p.lot_no LIKE ${pattern}
      OR EXISTS (SELECT 1 FROM items it WHERE it.item_code=p.item_code AND it.item_name LIKE ${pattern}))`);
  }
  for (const [key, field] of Object.entries(documentFields)) {
    const flag = input[key as keyof typeof documentFields];
    if (flag === undefined) continue;
    use('document_control');
    const present = {
      documentControl: { is: { deleted_at: null, [field]: { not: null } } },
    };
    clauses.push(flag ? present : { NOT: present });
    const condition = Prisma.sql`dc.id IS NOT NULL AND ${col('dc', field)} IS NOT NULL`;
    sql.push(flag ? Prisma.sql`(${condition})` : not(condition));
  }
  for (const field of actorFields) {
    if (!input[field]) continue;
    use('document_control');
    clauses.push({
      documentControl: { is: { deleted_at: null, [field]: input[field] } },
    });
    sql.push(Prisma.sql`${col('dc', field)}=${input[field]}`);
  }
  const from = input.today
    ? new Date(now.getTime() + 25200000).toISOString().slice(0, 10)
    : input.date_from;
  const to = input.today ? from : input.date_to;
  const start = from ? new Date(from + 'T00:00:00+07:00') : null;
  const end = to
    ? new Date(new Date(to + 'T00:00:00+07:00').getTime() + 86400000)
    : null;
  if (start || end) {
    const range = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lt: end } : {}),
    };
    let alias = 'p';
    let field: string = input.date_field;
    if (input.date_field === 'pyclm_sent_at') {
      use('pyclm');
      alias = 'sr';
      field = 'sent_at';
      requiresSql = true;
    } else if (
      input.date_field !== 'creation_date' &&
      input.date_field !== 'start_date'
    ) {
      use('document_control');
      alias = 'dc';
      clauses.push({
        documentControl: { is: { deleted_at: null, [field]: range } },
      });
    } else clauses.push({ [field]: range });
    if (start) sql.push(Prisma.sql`${col(alias, field)}>=${start}`);
    if (end) sql.push(Prisma.sql`${col(alias, field)}<${end}`);
  }
  if (
    input.pyclm_sent !== undefined ||
    input.pyclm_sender_id ||
    input.pyclm_location
  ) {
    use('pyclm');
    requiresSql = true;
    if (input.pyclm_sent !== undefined)
      sql.push(
        input.pyclm_sent
          ? Prisma.sql`sr.status='sent'`
          : Prisma.sql`(sr.id IS NULL OR sr.status<>'sent')`,
      );
    if (input.pyclm_sender_id)
      sql.push(Prisma.sql`sr.sender_id=${input.pyclm_sender_id}`);
    if (input.pyclm_location)
      sql.push(Prisma.sql`sr.location=${input.pyclm_location}`);
  }
  for (const key of [
    'has_saved_registration',
    'has_current_registration',
  ] as const) {
    const flag = input[key];
    if (flag === undefined) continue;
    use('registration');
    const saved = key === 'has_saved_registration';
    const present: Prisma.ProductionOrdersWhereInput = saved
      ? { registrationNumber: { isNot: null } }
      : { item: { registration: { is: { deleted_at: null } } } };
    clauses.push(flag ? present : { NOT: present });
    const expression = saved
      ? Prisma.sql`EXISTS (SELECT 1 FROM production_order_registration_numbers rg WHERE rg.production_order_id=p.id)`
      : Prisma.sql`EXISTS (SELECT 1 FROM items it JOIN registration_numbers rg ON rg.id=it.registration_id WHERE it.item_code=p.item_code AND rg.deleted_at IS NULL)`;
    sql.push(flag ? expression : not(expression));
  }
  if (input.registration_number) {
    use('registration');
    clauses.push({
      registrationNumber: {
        is: { registration_number: input.registration_number },
      },
    });
    sql.push(
      Prisma.sql`EXISTS (SELECT 1 FROM production_order_registration_numbers rg WHERE rg.production_order_id=p.id AND rg.registration_number=${input.registration_number})`,
    );
  }
  const presence = {
    ...input.presence,
    ...(input.has_production_guide !== undefined
      ? { production_guide: input.has_production_guide }
      : {}),
    ...(input.has_date_checks !== undefined
      ? { date_checks: input.has_date_checks }
      : {}),
  };
  for (const [key, flag] of Object.entries(presence)) {
    use(key);
    const group = orderSearchGroups[key];
    const base = groupConditions(key, input).prisma;
    const condition = {
      [group.relation]: group.singleton ? { is: base } : { some: base },
    };
    clauses.push(flag ? condition : { NOT: condition });
    sql.push(flag ? existsSql(key, input) : not(existsSql(key, input)));
  }
  const hasCriteria = (
    key: string,
    criteria: Record<string, unknown>,
    extraSql: Prisma.Sql[],
  ) => {
    use(key);
    clauses.push({
      [orderSearchGroups[key].relation]: {
        some: { ...groupConditions(key, input).prisma, ...criteria },
      },
    });
    sql.push(existsSql(key, input, extraSql));
  };
  if (input.date_check_status)
    hasCriteria('date_checks', { approval_status: input.date_check_status }, [
      Prisma.sql`r.approval_status=${input.date_check_status}`,
    ]);
  if (
    input.attachment_status ||
    input.attachment_requires_approval !== undefined ||
    input.attachment_type
  ) {
    const criteria: Record<string, unknown> = {};
    const extra: Prisma.Sql[] = [];
    if (input.attachment_status) {
      criteria.approval_status = input.attachment_status;
      extra.push(Prisma.sql`r.approval_status=${input.attachment_status}`);
    }
    if (input.attachment_requires_approval !== undefined) {
      criteria.requires_approval = input.attachment_requires_approval;
      extra.push(
        Prisma.sql`r.requires_approval=${input.attachment_requires_approval}`,
      );
    }
    hasCriteria('attachments', criteria, extra);
  }
  const mixingCriteria: Record<string, unknown> = {};
  const mixingSql: Prisma.Sql[] = [];
  for (const [status, field] of [
    [input.mixing_qa_status, 'qa_staff_approved_by_id'],
    [input.mixing_ipc_status, 'ipc_staff_approved_by_id'],
  ] as const) {
    if (!status) continue;
    mixingCriteria[field] = status === 'approved' ? { not: null } : null;
    mixingSql.push(
      status === 'approved'
        ? Prisma.sql`${col('r', field)} IS NOT NULL`
        : Prisma.sql`${col('r', field)} IS NULL`,
    );
  }
  if (input.mixing_record_type || mixingSql.length)
    hasCriteria('mixing_records', mixingCriteria, mixingSql);
  if (input.mixing_has_results !== undefined) {
    use('mixing_records');
    requiresSql = true;
    const expression = existsSql('mixing_records', input, [
      ...mixingSql,
      hasEnteredValue,
    ]);
    sql.push(input.mixing_has_results ? expression : not(expression));
  }
  const weighingCriteria: Record<string, unknown> = {};
  const weighingSql: Prisma.Sql[] = [];
  for (const [status, field] of [
    [input.weighing_qa_status, 'qa_staff_approved_by_id'],
    [input.weighing_ipc_status, 'ipc_staff_approved_by_id'],
  ] as const) {
    if (!status) continue;
    weighingCriteria[field] = status === 'approved' ? { not: null } : null;
    weighingSql.push(
      status === 'approved'
        ? Prisma.sql`${col('r', field)} IS NOT NULL`
        : Prisma.sql`${col('r', field)} IS NULL`,
    );
  }
  if (input.weighing_status || weighingSql.length)
    hasCriteria('weighing_records', weighingCriteria, weighingSql);
  if (input.weighing_has_weights !== undefined) {
    use('weighing_records');
    requiresSql = true;
    const expression = existsSql('weighing_records', input, [
      ...weighingSql,
      hasWeighingWeights,
    ]);
    sql.push(input.weighing_has_weights ? expression : not(expression));
  }
  if (input.sampling_type) hasCriteria('sampling_records', {}, []);
  if (input.semi_finished_summary_stage)
    hasCriteria('semi_finished_product_summaries', {}, []);
  if (input.material_process_stage)
    hasCriteria('material_process_summaries', {}, []);
  if (input.has_factory_release_approver !== undefined) {
    const condition = { approved_by_id: { not: null } };
    use('factory_release_reviews');
    const present = { factoryReleaseReviews: { some: condition } };
    clauses.push(
      input.has_factory_release_approver ? present : { NOT: present },
    );
    const expression = existsSql('factory_release_reviews', input, [
      Prisma.sql`r.approved_by_id IS NOT NULL`,
    ]);
    sql.push(input.has_factory_release_approver ? expression : not(expression));
  }
  if (input.deviation_approval_status)
    hasCriteria(
      'deviations',
      {
        approver_id:
          input.deviation_approval_status === 'approved' ? { not: null } : null,
      },
      [
        input.deviation_approval_status === 'approved'
          ? Prisma.sql`r.approver_id IS NOT NULL`
          : Prisma.sql`r.approver_id IS NULL`,
      ],
    );
  if (clauses.length) where.AND = clauses;
  const fromSql = Prisma.sql`FROM production_orders p
    ${includes.has('document_control') ? Prisma.sql`LEFT JOIN production_order_document_controls dc ON dc.production_order_id=p.id AND dc.deleted_at IS NULL` : Prisma.sql``}
    ${
      includes.has('pyclm')
        ? Prisma.sql`LEFT JOIN production_order_sampling_requests sr ON sr.id=(SELECT s.id FROM production_order_sampling_requests s
      WHERE s.production_order_id=p.id ORDER BY s.sent_at DESC,s.id DESC LIMIT 1)`
        : Prisma.sql``
    }`;
  return {
    input,
    where,
    whereSql: andSql(sql),
    fromSql,
    requiresSql,
    includes: [...includes],
    counts: [...counts],
    date_range: {
      field: input.date_field,
      timezone: 'Asia/Ho_Chi_Minh',
      from_inclusive: start?.toISOString() ?? null,
      to_exclusive: end?.toISOString() ?? null,
    },
  };
}

type Plan = ReturnType<typeof buildOrderSearch>;
type Column = {
  group: string;
  key: string;
  alias: string;
  kind: 'boolean' | 'number' | 'value';
};
export function orderSearchMetadataQuery(plan: Plan, ids: number[]) {
  const columns: Column[] = [];
  const expressions: Prisma.Sql[] = [Prisma.sql`p.id`];
  const add = (
    group: string,
    key: string,
    expression: Prisma.Sql,
    kind: Column['kind'] = 'value',
  ) => {
    const alias = 'v' + columns.length;
    columns.push({ group, key, alias, kind });
    expressions.push(Prisma.sql`${expression} AS ${ident(alias)}`);
  };
  for (const key of plan.includes) {
    if (key === 'document_control') {
      for (const [flag, field] of Object.entries(documentFields)) {
        add(key, flag, Prisma.sql`${col('dc', field)} IS NOT NULL`, 'boolean');
        add(key, field, col('dc', field));
        const actor = field.replace(/_at$/, '_by_id');
        add(key, actor, col('dc', actor));
        add(
          key,
          flag + '_by_name',
          Prisma.sql`(SELECT u.name FROM users u WHERE u.id=${col('dc', actor)})`,
        );
      }
    } else if (key === 'pyclm') {
      add(key, 'sent', Prisma.sql`COALESCE(sr.status='sent',0)`, 'boolean');
      for (const field of [
        'status',
        'sent_at',
        'sender_id',
        'location',
        'google_doc_url',
      ])
        add(key, field, col('sr', field));
      add(
        key,
        'sender_name',
        Prisma.sql`(SELECT u.name FROM users u WHERE u.id=sr.sender_id)`,
      );
    } else if (key === 'registration') {
      add(
        key,
        'saved_number',
        Prisma.sql`(SELECT rg.registration_number FROM production_order_registration_numbers rg WHERE rg.production_order_id=p.id)`,
      );
      add(
        key,
        'current_item_number',
        Prisma.sql`(SELECT rg.registration_number FROM items it JOIN registration_numbers rg ON rg.id=it.registration_id WHERE it.item_code=p.item_code AND rg.deleted_at IS NULL)`,
      );
    } else {
      const group = orderSearchGroups[key];
      add(key, 'has_data', existsSql(key, plan.input), 'boolean');
      add(
        key,
        'latest_at',
        Prisma.sql`(SELECT MAX(${col('r', group.dateField)}) FROM ${ident(group.table)} r WHERE r.production_order_id=p.id AND ${andSql(groupConditions(key, plan.input).sql)})`,
      );
      const statuses =
        key === 'date_checks' || key === 'attachments'
          ? ['pending', 'approved', 'rejected']
          : [];
      for (const status of statuses)
        add(
          key,
          'has_' + status,
          existsSql(key, plan.input, [Prisma.sql`r.approval_status=${status}`]),
          'boolean',
        );
      if (key === 'attachments')
        add(
          key,
          'requires_approval',
          existsSql(key, plan.input, [Prisma.sql`r.requires_approval=1`]),
          'boolean',
        );
      if (key === 'mixing_records' || key === 'weighing_records') {
        for (const [name, field] of [
          ['qa', 'qa_staff_approved_by_id'],
          ['ipc', 'ipc_staff_approved_by_id'],
        ]) {
          add(
            key,
            'has_' + name + '_approved',
            existsSql(key, plan.input, [
              Prisma.sql`${col('r', field)} IS NOT NULL`,
            ]),
            'boolean',
          );
          add(
            key,
            'has_' + name + '_pending',
            existsSql(key, plan.input, [
              Prisma.sql`${col('r', field)} IS NULL`,
            ]),
            'boolean',
          );
        }
        const weighing = key === 'weighing_records';
        if (
          (weighing
            ? plan.input.weighing_has_weights
            : plan.input.mixing_has_results) !== undefined
        ) {
          const enteredScope: Prisma.Sql[] = [
            weighing ? hasWeighingWeights : hasEnteredValue,
          ];
          for (const [status, field] of [
            [
              weighing
                ? plan.input.weighing_qa_status
                : plan.input.mixing_qa_status,
              'qa_staff_approved_by_id',
            ],
            [
              weighing
                ? plan.input.weighing_ipc_status
                : plan.input.mixing_ipc_status,
              'ipc_staff_approved_by_id',
            ],
          ] as const) {
            if (status)
              enteredScope.push(
                status === 'approved'
                  ? Prisma.sql`${col('r', field)} IS NOT NULL`
                  : Prisma.sql`${col('r', field)} IS NULL`,
              );
          }
          add(
            key,
            weighing ? 'has_weights' : 'has_results',
            existsSql(key, plan.input, enteredScope),
            'boolean',
          );
        }
      }
      if (key === 'factory_release_reviews')
        add(
          key,
          'has_approver',
          existsSql(key, plan.input, [
            Prisma.sql`r.approved_by_id IS NOT NULL`,
          ]),
          'boolean',
        );
      if (key === 'deviations')
        add(
          key,
          'has_pending_approval',
          existsSql(key, plan.input, [Prisma.sql`r.approver_id IS NULL`]),
          'boolean',
        );
    }
  }
  for (const key of plan.counts) {
    const group = orderSearchGroups[key];
    add(
      'counts',
      key,
      Prisma.sql`(SELECT COUNT(*) FROM ${ident(group.table)} r WHERE r.production_order_id=p.id AND ${andSql(groupConditions(key, plan.input).sql)})`,
      'number',
    );
  }
  return {
    columns,
    query: Prisma.sql`SELECT ${Prisma.join(expressions)} ${plan.fromSql} WHERE p.id IN (${Prisma.join(ids)})`,
  };
}

export function decodeOrderSearchMetadata(
  row: Record<string, unknown>,
  columns: Column[],
) {
  const result: Record<string, Record<string, unknown>> = {};
  for (const column of columns) {
    const value = row[column.alias];
    (result[column.group] ??= {})[column.key] =
      column.kind === 'boolean'
        ? !!Number(value)
        : column.kind === 'number'
          ? Number(value)
          : (value ?? null);
  }
  return result;
}
