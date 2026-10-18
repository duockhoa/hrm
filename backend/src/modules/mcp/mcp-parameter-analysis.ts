import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import { recordSections } from './mcp-record-sections';
import {
  analyticsFields,
  analyticsText,
  validateAnalyticsDates,
  analyticsPeriod,
  analyticsIdentifier as ident,
  analyticsColumn as col,
  analyticsAnd,
  analyticsOrderConditions,
  analyticsTimeBucket,
  requireAnalyticsPermissions,
  analyticsNumber,
  decodeAnalyticsRow,
  analyticsPagination,
} from './mcp-analytics-common';

type Measure = { fields: string[]; unit?: string; unitField?: string };
type Source = {
  model: string;
  dateField: string;
  contextField?: string;
  parameters: Record<string, Measure>;
};
const units = (count: number, suffix: string) =>
  Array.from({ length: count }, (_, i) => `unit_${i + 1}_${suffix}`);
export const parameterSources = {
  post_preparation_solution_checks: {
    model: 'ProductionOrderPostPreparationSolutionChecks',
    dateField: 'created_at',
    parameters: {
      ph: { fields: ['solution_ph_1', 'solution_ph_2', 'solution_ph_3'] },
    },
  },
  density_checks: {
    model: 'ProductionOrderDensityChecks',
    dateField: 'created_at',
    parameters: {
      density: { fields: ['density'] },
      apparent_density: { fields: ['apparent_density'] },
    },
  },
  post_homogenization_granule_checks: {
    model: 'ProductionOrderPostHomogenizationGranuleChecks',
    dateField: 'created_at',
    parameters: {
      bulk_density: { fields: ['bulk_density'], unitField: 'density_unit' },
      tapped_density: { fields: ['tapped_density'], unitField: 'density_unit' },
      carr_index: { fields: ['carr_index'], unit: '%' },
      moisture_percent: { fields: ['moisture_percent'], unit: '%' },
    },
  },
  hardness_checks: {
    model: 'ProductionOrderHardnessChecks',
    dateField: 'created_at',
    contextField: 'dosage_form_stage',
    parameters: {
      hardness: { fields: units(10, 'hardness'), unitField: 'unit' },
    },
  },
  tablet_thickness_checks: {
    model: 'ProductionOrderTabletThicknessChecks',
    dateField: 'created_at',
    contextField: 'dosage_form_stage',
    parameters: {
      thickness: { fields: units(10, 'thickness'), unitField: 'unit' },
    },
  },
  volume_checks: {
    model: 'ProductionOrderVolumeChecks',
    dateField: 'created_at',
    contextField: 'dosage_form_stage',
    parameters: { volume: { fields: units(6, 'volume'), unitField: 'unit' } },
  },
  environment_checks: {
    model: 'ProductionOrderEnvironmentChecks',
    dateField: 'checked_at',
    contextField: 'room',
    parameters: {
      temperature_c: { fields: ['temperature_c'], unit: '°C' },
      humidity_percent: { fields: ['humidity_percent'], unit: '%' },
    },
  },
  friability_checks: {
    model: 'ProductionOrderFriabilityChecks',
    dateField: 'created_at',
    parameters: {
      friability_percent: { fields: ['friability_percent'], unit: '%' },
    },
  },
  steam_sterilization_checks: {
    model: 'ProductionOrderSteamSterilizationChecks',
    dateField: 'checked_at',
    contextField: 'equipment_name',
    parameters: {
      setting_temperature: { fields: ['setting_temperature'], unit: '°C' },
      setting_time: { fields: ['setting_time'] },
    },
  },
  filtration_checks: {
    model: 'ProductionOrderFiltrationChecks',
    dateField: 'created_at',
    contextField: 'filter_position',
    parameters: {
      rinse_water_volume_liters: {
        fields: ['rinse_water_volume_liters'],
        unit: 'L',
      },
      tank_residual_volume_liters: {
        fields: ['tank_residual_volume_liters'],
        unit: 'L',
      },
    },
  },
  spray_dose_checks: {
    model: 'ProductionOrderSprayDoseChecks',
    dateField: 'created_at',
    parameters: {
      spray_dose_count: {
        fields: Array.from(
          { length: 6 },
          (_, i) => `bottle_${i + 1}_spray_dose_count`,
        ),
        unitField: 'unit',
      },
    },
  },
  semi_finished_gross_weight_checks: {
    model: 'ProductionOrderSemiFinishedProductGrossWeightChecks',
    dateField: 'created_at',
    parameters: {
      gross_weight: { fields: units(10, 'gross_weight'), unitField: 'unit' },
    },
  },
  semi_finished_net_weight_checks: {
    model: 'ProductionOrderSemiFinishedProductNetWeightChecks',
    dateField: 'created_at',
    parameters: {
      net_weight: { fields: units(10, 'net_weight'), unitField: 'unit' },
    },
  },
} satisfies Record<string, Source>;
const sourceCatalog: Record<string, Source> = parameterSources;
const sourceKeys = ['mixing_records', ...Object.keys(parameterSources)] as [
  string,
  ...string[],
];
const catalogDescription = Object.entries(parameterSources)
  .map(
    ([key, config]) => `${key}: ${Object.keys(config.parameters).join(', ')}`,
  )
  .join('; ');
export const parameterAnalysisSchema = z
  .object({
    ...analyticsFields,
    source: z
      .enum(sourceKeys)
      .describe('Nguồn phép đo. Không gộp kết quả giữa các nguồn.'),
    parameter: analyticsText(255).describe(
      'mixing_records: tên thông số chính xác, ví dụ pH. Nguồn cố định: ' +
        catalogDescription,
    ),
    date_field: z
      .enum(['start_date', 'creation_date', 'recorded_at'])
      .default('start_date'),
    group_by: z
      .enum(['none', 'day', 'month', 'item_code', 'production_order'])
      .default('none'),
    sort_by: z
      .enum(['group', 'average_asc', 'average_desc', 'min_asc', 'max_desc'])
      .default('group'),
    unit: analyticsText(50).nullable().optional(),
    context: analyticsText(255)
      .optional()
      .describe(
        'Lọc chính xác công đoạn, phòng hoặc vị trí của nguồn kiểm tra; tên trường được trả trong context_field.',
      ),
    record_type: analyticsText(50).optional(),
    template_version: analyticsText(50).optional(),
    stage_name: analyticsText(255).optional(),
    step_name: analyticsText(255).optional(),
    qa_status: z.enum(['approved', 'pending']).optional(),
    ipc_status: z.enum(['approved', 'pending']).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    validateAnalyticsDates(input, ctx);
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (input.source !== 'mixing_records') {
      const config = sourceCatalog[input.source];
      if (!Object.hasOwn(config.parameters, input.parameter))
        fail('Thông số không được hỗ trợ cho nguồn đã chọn.');
      if (
        input.record_type ||
        input.template_version ||
        input.stage_name ||
        input.step_name ||
        input.qa_status ||
        input.ipc_status
      )
        fail('Bộ lọc phiếu pha chế chỉ áp dụng cho mixing_records.');
      if (input.context && !config.contextField)
        fail('Nguồn này không có context để lọc.');
    } else if (input.context)
      fail('Dùng stage_name/step_name để lọc công đoạn pha chế.');
  });
export type ParameterAnalysisInput = z.output<typeof parameterAnalysisSchema>;

// Preserve case and separate units such as m/M or mg/Mg even under a database
// collation that otherwise compares labels without case sensitivity.
const label = (expression: Prisma.Sql) =>
  Prisma.sql`CAST(${expression} AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_bin`;
const nullLabel = Prisma.sql`CAST(NULL AS CHAR)`;
const numericPattern = '^[+-]?([0-9]{1,18}([.,][0-9]{1,10})?|[.,][0-9]{1,10})$';
const identity = Prisma.sql`item_code,unit,record_type,template_version,stage_name,step_name,context`;
const countFields = [
  'order_count',
  'record_count',
  'slot_count',
  'measurement_count',
  'valid_order_count',
  'missing_count',
  'invalid_count',
  'non_numeric_type_count',
];
const counts = Prisma.sql`COUNT(DISTINCT order_id) AS order_count,COUNT(DISTINCT record_id) AS record_count,COUNT(*) AS slot_count,
  COUNT(numeric_value) AS measurement_count,COUNT(DISTINCT CASE WHEN numeric_value IS NOT NULL THEN order_id END) AS valid_order_count,
  COALESCE(SUM(quality='missing'),0) AS missing_count,COALESCE(SUM(quality='invalid'),0) AS invalid_count,
  COALESCE(SUM(quality='non_numeric_type'),0) AS non_numeric_type_count`;

export function buildParameterAnalysis(
  input: ParameterAnalysisInput,
  permissions: string[],
  now = new Date(),
) {
  const mixing = input.source === 'mixing_records';
  const source = sourceCatalog[input.source];
  const permission = mixing
    ? 'production-orders.read'
    : recordSections[input.source as keyof typeof recordSections].permission;
  requireAnalyticsPermissions(permissions, [
    'production-orders.list',
    'production-orders.read',
    permission,
  ]);
  const period = analyticsPeriod(input, now);
  let join: Prisma.Sql,
    rawValue: Prisma.Sql,
    rawUnit: Prisma.Sql,
    recordDate: Prisma.Sql,
    dataType: Prisma.Sql;
  let context = nullLabel,
    recordType = nullLabel,
    version = nullLabel,
    stage = nullLabel,
    step = nullLabel;
  const extras: Prisma.Sql[] = [];
  let unitBasis: string;
  if (mixing) {
    join = Prisma.sql`JOIN production_order_mixing_records r ON r.production_order_id=p.id
      JOIN production_order_mixing_record_stages ms ON ms.production_order_mixing_record_id=r.id
      JOIN production_order_mixing_record_steps mt ON mt.production_order_mixing_record_stage_id=ms.id
      JOIN production_order_mixing_record_parameters mp ON mp.production_order_mixing_record_step_id=mt.id`;
    rawValue = Prisma.sql`mp.result_value`;
    rawUnit = Prisma.sql`mp.unit`;
    dataType = Prisma.sql`mp.data_type`;
    recordDate = Prisma.sql`COALESCE(mp.recorded_at,r.created_at)`;
    recordType = label(Prisma.sql`r.record_type`);
    version = label(Prisma.sql`r.template_version`);
    stage = label(Prisma.sql`ms.stage_name`);
    step = label(Prisma.sql`mt.step_name`);
    unitBasis = 'saved_parameter_unit';
    extras.push(
      Prisma.sql`${label(Prisma.sql`mp.parameter_name`)}=${input.parameter}`,
    );
    for (const [value, expression] of [
      [input.record_type, recordType],
      [input.template_version, version],
      [input.stage_name, stage],
      [input.step_name, step],
    ] as const)
      if (value) extras.push(Prisma.sql`${expression}=${value}`);
    for (const [status, field] of [
      [input.qa_status, 'qa_staff_approved_by_id'],
      [input.ipc_status, 'ipc_staff_approved_by_id'],
    ] as const)
      if (status)
        extras.push(
          status === 'approved'
            ? Prisma.sql`${col('r', field)} IS NOT NULL`
            : Prisma.sql`${col('r', field)} IS NULL`,
        );
  } else {
    const measure = source.parameters[input.parameter];
    const model = Prisma.dmmf.datamodel.models.find(
      (model) => model.name === source.model,
    )!;
    const fields = measure.fields;
    const slots = Prisma.join(
      fields.map((_, index) => Prisma.sql`SELECT ${index} AS slot`),
      ' UNION ALL ',
    );
    join = Prisma.sql`JOIN ${ident(model.dbName ?? model.name)} r ON r.production_order_id=p.id CROSS JOIN (${slots}) n`;
    rawValue = Prisma.sql`CASE n.slot ${Prisma.join(
      fields.map(
        (field, index) => Prisma.sql`WHEN ${index} THEN ${col('r', field)}`,
      ),
      ' ',
    )} END`;
    rawUnit = measure.unitField
      ? col('r', measure.unitField)
      : measure.unit
        ? Prisma.sql`${measure.unit}`
        : nullLabel;
    recordDate = col('r', source.dateField);
    dataType = Prisma.sql`'decimal'`;
    unitBasis = measure.unitField
      ? 'saved_record_unit'
      : measure.unit
        ? 'field_definition'
        : 'dimensionless_or_not_recorded';
    if (source.contextField) context = label(col('r', source.contextField));
    if (input.context) extras.push(Prisma.sql`${context}=${input.context}`);
  }
  const unit = label(Prisma.sql`NULLIF(TRIM(${rawUnit}),'')`);
  if (input.unit !== undefined)
    extras.push(
      input.unit === null
        ? Prisma.sql`${unit} IS NULL`
        : Prisma.sql`${unit}=${input.unit}`,
    );
  const date =
    input.date_field === 'recorded_at'
      ? recordDate
      : col('p', input.date_field);
  const conditions = [
    ...analyticsOrderConditions(input, date, period),
    ...extras,
  ];
  const key =
    input.group_by === 'day' || input.group_by === 'month'
      ? analyticsTimeBucket(date, input.group_by)
      : input.group_by === 'production_order'
        ? Prisma.sql`CAST(p.id AS CHAR)`
        : input.group_by === 'item_code'
          ? Prisma.sql`p.item_code`
          : Prisma.sql`'all'`;
  const ctes = Prisma.sql`raw_observations AS (SELECT p.id AS order_id,p.item_code,p.production_order_code,p.lot_no,r.id AS record_id,
    ${unit} AS unit,${recordType} AS record_type,${version} AS template_version,${stage} AS stage_name,${step} AS step_name,${context} AS context,
    ${key} AS group_key,${dataType} AS data_type,
    REGEXP_REPLACE(COALESCE(CAST(${rawValue} AS CHAR),''),'^[[:space:]]+|[[:space:]]+$','') AS text_value
    FROM production_orders p ${join} WHERE ${analyticsAnd(conditions)}),
    classified AS (SELECT raw_observations.*,CASE WHEN text_value='' THEN 'missing'
      WHEN data_type NOT IN ('number','decimal') THEN 'non_numeric_type'
      WHEN text_value REGEXP ${numericPattern} THEN 'valid' ELSE 'invalid' END AS quality FROM raw_observations),
    observations AS (SELECT classified.*,CASE WHEN quality='valid' THEN CAST(REPLACE(text_value,',','.') AS DECIMAL(30,10)) END AS numeric_value FROM classified)`;
  const orderId =
    input.group_by === 'production_order'
      ? Prisma.sql`MAX(order_id)`
      : Prisma.sql`NULL`;
  const orderCode =
    input.group_by === 'production_order'
      ? Prisma.sql`MAX(production_order_code)`
      : nullLabel;
  const lot =
    input.group_by === 'production_order' ? Prisma.sql`MAX(lot_no)` : nullLabel;
  const grouped = Prisma.sql`SELECT 1 AS has_group,group_key,${identity},${orderId} AS production_order_id,${orderCode} AS production_order_code,${lot} AS lot_no,
    ${counts},MIN(numeric_value) AS min_value,MAX(numeric_value) AS max_value,AVG(numeric_value) AS average_value,STDDEV_POP(numeric_value) AS population_stddev
    FROM observations GROUP BY group_key,${identity}`;
  const ordering =
    input.sort_by === 'group'
      ? Prisma.sql`group_key,${identity}`
      : input.sort_by === 'average_asc'
        ? Prisma.sql`average_value IS NULL,average_value ASC,group_key,${identity}`
        : input.sort_by === 'average_desc'
          ? Prisma.sql`average_value IS NULL,average_value DESC,group_key,${identity}`
          : input.sort_by === 'min_asc'
            ? Prisma.sql`min_value IS NULL,min_value ASC,group_key,${identity}`
            : Prisma.sql`max_value IS NULL,max_value DESC,group_key,${identity}`;
  return {
    input,
    unit_basis: unitBasis,
    context_field: mixing
      ? 'stage_name/step_name'
      : (source.contextField ?? null),
    date_range: {
      ...period.metadata,
      field: input.date_field,
      recorded_at_definition: mixing
        ? 'parameter.recorded_at, fallback record.created_at'
        : source.dateField,
    },
    summaryQuery: Prisma.sql`WITH ${ctes} SELECT ${counts} FROM observations`,
    dataQuery: Prisma.sql`WITH ${ctes},grouped AS (${grouped}) SELECT g.*,t.total_groups FROM (SELECT COUNT(*) AS total_groups FROM grouped) t
      LEFT JOIN (SELECT * FROM grouped ORDER BY ${ordering} LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}) g ON 1=1`,
  };
}

export function decodeParameterAnalysis(
  plan: ReturnType<typeof buildParameterAnalysis>,
  summaryRows: Record<string, unknown>[],
  rows: Record<string, unknown>[],
) {
  const summary = Object.fromEntries(
    countFields.map((key) => [
      key,
      analyticsNumber(summaryRows[0]?.[key]) ?? 0,
    ]),
  );
  const data = rows
    .filter((row) => Number(row.has_group) === 1)
    .map((row) =>
      decodeAnalyticsRow(row, [
        ...countFields,
        'production_order_id',
        'min_value',
        'max_value',
        'average_value',
        'population_stddev',
      ]),
    );
  const total = analyticsNumber(rows[0]?.total_groups) ?? 0;
  return {
    source: plan.input.source,
    parameter: plan.input.parameter,
    aggregation: 'measurement_weighted',
    unit_basis: plan.unit_basis,
    context_field: plan.context_field,
    group_by: plan.input.group_by,
    date_range: plan.date_range,
    include_cancelled: plan.input.include_cancelled,
    summary,
    data,
    pagination: analyticsPagination(plan.input, total, data.length),
  };
}
