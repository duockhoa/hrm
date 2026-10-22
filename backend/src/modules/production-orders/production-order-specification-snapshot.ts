import { InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const productionSpecificationInclude = {
  productLine: true,
  dosageForm: true,
} satisfies Prisma.ProductionSpecificationsInclude;

type Specification = Prisma.ProductionSpecificationsGetPayload<{
  include: typeof productionSpecificationInclude;
}>;

const decimalFields = [
  'lower_control_limit',
  'upper_control_limit',
  'lower_allowed_limit',
  'upper_allowed_limit',
  'spray_dose_lower_allowed_limit',
  'spray_dose_upper_allowed_limit',
  'spray_dose_lower_control_limit',
  'spray_dose_upper_control_limit',
  'film_coated_tablet_weight_lower_control_limit',
  'film_coated_tablet_weight_upper_control_limit',
  'film_coated_tablet_weight_lower_allowed_limit',
  'film_coated_tablet_weight_upper_allowed_limit',
  'hardness_lower_control_limit',
  'hardness_upper_control_limit',
  'hardness_lower_allowed_limit',
  'hardness_upper_allowed_limit',
  'tablet_thickness_control_limit',
  'tablet_thickness_allowed_limit',
  'disintegration_time_control_limit',
  'disintegration_time_allowed_limit',
] as const;

const decimal = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?$/)
  .nullable();
const specificationSchema = z
  .object({
    ...Object.fromEntries(decimalFields.map((field) => [field, decimal])),
    item_code: z.string(),
    product_line_id: z.number().int().nullable(),
    dosage_form_id: z.number().int().nullable(),
    lower_control_limit_operator: z.string().nullable(),
    upper_control_limit_operator: z.string().nullable(),
    lower_allowed_limit_operator: z.string().nullable(),
    upper_allowed_limit_operator: z.string().nullable(),
    unit: z.string().nullable(),
    film_coated_tablet_weight_unit: z.string().nullable(),
    hardness_unit: z.string(),
    tablet_thickness_unit: z.string(),
    disintegration_time_unit: z.string(),
    productLine: z
      .object({ id: z.number(), code: z.string(), name: z.string() })
      .passthrough()
      .nullable(),
    dosageForm: z
      .object({
        id: z.number(),
        name: z.string(),
        sensory_requirement: z.string().nullable(),
      })
      .passthrough()
      .nullable(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
    deleted_at: z.iso.datetime().nullable(),
  })
  .passthrough();

const snapshotSchema = z.object({
  version: z.literal(1),
  source: z.literal('pyclm'),
  captured_at: z.iso.datetime(),
  captured_by_id: z.number().int().positive().nullable(),
  item_code: z.string(),
  // null explicitly freezes the absence of a specification, too.
  specification: specificationSchema.nullable(),
});

export const createProductionSpecificationSnapshot = (
  itemCode: string,
  specification: Specification | null,
  capturedAt: Date,
  capturedById: number | null,
): Prisma.InputJsonObject =>
  JSON.parse(
    JSON.stringify({
      version: 1,
      source: 'pyclm',
      captured_at: capturedAt.toISOString(),
      captured_by_id: capturedById,
      item_code: itemCode,
      specification: specification?.deleted_at ? null : specification,
    }),
  ) as Prisma.InputJsonObject;

export const readProductionSpecificationSnapshot = (
  value: Prisma.JsonValue | null | undefined,
  itemCode: string,
) => {
  if (value == null) return null;
  const result = snapshotSchema.safeParse(value);
  if (
    !result.success ||
    result.data.item_code !== itemCode ||
    (result.data.specification &&
      result.data.specification.item_code !== itemCode)
  ) {
    throw new InternalServerErrorException(
      'Invalid production order specification snapshot',
    );
  }
  return result.data;
};

export const resolveProductionOrderSpecification = (order: {
  item_code: string;
  item?: { productionSpecification?: Specification | null } | null;
  documentControl?: {
    production_specification_snapshot?: Prisma.JsonValue | null;
  } | null;
}) => {
  const snapshot = readProductionSpecificationSnapshot(
    order.documentControl?.production_specification_snapshot,
    order.item_code,
  );
  const current = order.item?.productionSpecification;
  return {
    productionSpecification: snapshot
      ? snapshot.specification
      : current?.deleted_at
        ? null
        : (current ?? null),
    productionSpecificationSource: snapshot
      ? ('snapshot' as const)
      : ('item' as const),
    productionSpecificationCapturedAt: snapshot?.captured_at ?? null,
  };
};
