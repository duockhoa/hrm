import { Prisma } from '@prisma/client';

const userSelect = { id: true, name: true, username: true } as const;
const fields = <T extends string>(...keys: T[]): Record<T, true> =>
  Object.fromEntries(keys.map((key) => [key, true])) as Record<T, true>;

export const itemSearchSelect = {
  item_code: true,
  item_name: true,
  unit: true,
  dk_code: true,
  registration: {
    select: {
      id: true,
      registration_number: true,
      product_name: true,
      deleted_at: true,
    },
  },
} satisfies Prisma.ItemsSelect;

export const itemDetailSelect = {
  ...itemSearchSelect,
  created_at: true,
  update_at: true,
  productionSpecification: {
    select: {
      ...fields(
        'item_code',
        'product_line_id',
        'dosage_form_id',
        'lower_control_limit',
        'lower_control_limit_operator',
        'upper_control_limit',
        'upper_control_limit_operator',
        'lower_allowed_limit',
        'lower_allowed_limit_operator',
        'upper_allowed_limit',
        'upper_allowed_limit_operator',
        'unit',
        'spray_dose_lower_allowed_limit',
        'spray_dose_upper_allowed_limit',
        'spray_dose_lower_control_limit',
        'spray_dose_upper_control_limit',
        'film_coated_tablet_weight_lower_control_limit',
        'film_coated_tablet_weight_upper_control_limit',
        'film_coated_tablet_weight_lower_allowed_limit',
        'film_coated_tablet_weight_upper_allowed_limit',
        'film_coated_tablet_weight_unit',
        'hardness_lower_control_limit',
        'hardness_upper_control_limit',
        'hardness_lower_allowed_limit',
        'hardness_upper_allowed_limit',
        'hardness_unit',
        'tablet_thickness_control_limit',
        'tablet_thickness_allowed_limit',
        'tablet_thickness_unit',
        'disintegration_time_control_limit',
        'disintegration_time_allowed_limit',
        'disintegration_time_unit',
        'created_at',
        'updated_at',
        'deleted_at',
      ),
      productLine: { select: { id: true, code: true, name: true } },
      dosageForm: { select: { id: true, name: true } },
      updatedBy: { select: userSelect },
    },
  },
  itemFeatures: {
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      feature_id: true,
      enabled: true,
      required: true,
      order: true,
      feature: {
        select: {
          key: true,
          kind: true,
          label: true,
          group_name: true,
          default_order: true,
        },
      },
    },
  },
  itemEquipment: {
    orderBy: { id: 'asc' },
    select: {
      ...fields('id', 'equipment_id', 'created_at', 'updated_at'),
      createdBy: { select: userSelect },
      equipment: {
        select: {
          id: true,
          code: true,
          name: true,
          parameters: {
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            select: {
              ...fields('id', 'name', 'data_type', 'unit', 'is_required'),
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ItemsSelect;

export const itemMixingTemplateSelect = {
  ...fields(
    'id',
    'item_code',
    'version',
    'batch_size',
    'unit_of_measure',
    'description',
    'status',
    'created_at',
    'updated_at',
  ),
  createdBy: { select: userSelect },
  stages: {
    orderBy: [{ stage_order: 'asc' }, { id: 'asc' }],
    select: {
      ...fields('id', 'stage_name', 'stage_order', 'created_at', 'updated_at'),
      createdBy: { select: userSelect },
      steps: {
        orderBy: [{ step_order: 'asc' }, { id: 'asc' }],
        select: {
          ...fields(
            'id',
            'step_name',
            'step_order',
            'created_at',
            'updated_at',
          ),
          createdBy: { select: userSelect },
          parameters: {
            orderBy: [{ parameter_order: 'asc' }, { id: 'asc' }],
            select: {
              ...fields(
                'id',
                'parameter_name',
                'data_type',
                'unit',
                'requirement',
                'parameter_order',
                'created_at',
                'updated_at',
              ),
              createdBy: { select: userSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MixingActivityTemplatesSelect;

export const itemDatePrintTemplateSelect = {
  ...fields(
    'id',
    'item_code',
    'version',
    'description',
    'print_content',
    'print_position',
    'status',
    'image_path',
    'manufacturing_date_format',
    'expiry_date_format',
    'created_at',
    'updated_at',
  ),
  createdBy: { select: userSelect },
} satisfies Prisma.DatePrintTemplatesSelect;
