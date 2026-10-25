import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';

export const weighingSearchSchema = z
  .object({
    item_code: z.string().trim().min(1).max(100).optional(),
    production_order_code: z.string().trim().min(1).max(100).optional(),
    production_order_id: z.number().int().positive().max(2147483647).optional(),
    lot_no: z.string().trim().min(1).max(100).optional(),
    query: z.string().trim().min(1).max(100).optional(),
    material_code: z.string().trim().min(1).max(255).optional(),
    has_weights: z.boolean().optional(),
    status: z
      .enum(['draft', 'in_progress', 'completed', 'approved', 'cancelled'])
      .optional(),
    created_by_id: z.number().int().positive().max(2147483647).optional(),
    qa_status: z.enum(['approved', 'pending']).optional(),
    ipc_status: z.enum(['approved', 'pending']).optional(),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    page: z.number().int().min(1).max(1000000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (input) =>
      !input.date_from || !input.date_to || input.date_from <= input.date_to,
    {
      message: 'date_from phải nhỏ hơn hoặc bằng date_to.',
    },
  );

export const weighingReadSchema = z
  .object({
    ids: z
      .array(z.number().int().positive().max(2147483647))
      .min(1)
      .max(10)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'ids không được trùng lặp.',
      }),
    view: z.enum(['full', 'results']).default('full'),
  })
  .strict();

export type WeighingSearchInput = z.output<typeof weighingSearchSchema>;
export type WeighingReadInput = z.output<typeof weighingReadSchema>;

export const weighingOrderSelect = {
  id: true,
  production_order_code: true,
  item_code: true,
  lot_no: true,
  item: { select: { item_name: true } },
} satisfies Prisma.ProductionOrdersSelect;

const userSelect = { id: true, name: true, username: true } as const;
export const weighingSummarySelect = {
  id: true,
  production_order_id: true,
  status: true,
  _count: { select: { lines: true } },
  description: true,
  created_at: true,
  updated_at: true,
  qa_staff_approved_at: true,
  ipc_staff_approved_at: true,
  createdBy: { select: userSelect },
  qaStaffApprovedBy: { select: userSelect },
  ipcStaffApprovedBy: { select: userSelect },
  productionOrder: { select: weighingOrderSelect },
} satisfies Prisma.ProductionOrderWeighingRecordsSelect;

export const weighingDetailSelect = {
  ...weighingSummarySelect,
  lines: {
    orderBy: [{ item_code: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      source_line_number: true,
      source_stage_id: true,
      stage_name: true,
      item_code: true,
      item_name: true,
      lot_no: true,
      planned_quantity: true,
      unit: true,
      note: true,
      created_at: true,
      updated_at: true,
      details: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          net_weight: true,
          unit: true,
          note: true,
          image_path: true,
          images: {
            orderBy: { id: 'asc' },
            select: { id: true, image_path: true, created_at: true },
          },
          weighedBy: { select: userSelect },
          weighed_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderWeighingRecordsSelect;

type WeighingLine = Prisma.ProductionOrderWeighingRecordsGetPayload<{
  select: typeof weighingDetailSelect;
}>['lines'][number];

const ExactDecimal = Prisma.Decimal.clone({ precision: 100 });

export function weighingTotals(lines: WeighingLine[]) {
  const groups = new Map<
    string,
    {
      item_code: string;
      unit: string;
      line_ids: number[];
      required_quantity: Prisma.Decimal;
      weights: Map<string, Prisma.Decimal>;
      weighing_count: number;
    }
  >();
  for (const line of lines) {
    const key = JSON.stringify([line.item_code, line.unit]);
    const group = groups.get(key) ?? {
      item_code: line.item_code,
      unit: line.unit,
      line_ids: [] as number[],
      required_quantity: new ExactDecimal(0),
      weights: new Map<string, Prisma.Decimal>(),
      weighing_count: 0,
    };
    group.line_ids.push(line.id);
    group.required_quantity = group.required_quantity.plus(
      line.planned_quantity,
    );
    for (const detail of line.details) {
      group.weights.set(
        detail.unit,
        (group.weights.get(detail.unit) ?? new ExactDecimal(0)).plus(
          detail.net_weight,
        ),
      );
      group.weighing_count++;
    }
    groups.set(key, group);
  }
  return [...groups.values()].map(
    ({ weights, required_quantity, ...group }) => ({
      ...group,
      required_quantity: required_quantity.toFixed(),
      actual_quantities: [...weights].map(([unit, value]) => ({
        unit,
        quantity: value.toFixed(),
      })),
    }),
  );
}

export function buildWeighingSearch(input: WeighingSearchInput) {
  const start = input.date_from
    ? new Date(`${input.date_from}T00:00:00+07:00`)
    : null;
  const end = input.date_to
    ? new Date(new Date(`${input.date_to}T00:00:00+07:00`).getTime() + 86400000)
    : null;
  const where: Prisma.ProductionOrderWeighingRecordsWhereInput = {
    ...(input.production_order_id
      ? { production_order_id: input.production_order_id }
      : {}),
    ...(input.item_code || input.production_order_code || input.lot_no
      ? {
          productionOrder: {
            is: {
              ...(input.item_code ? { item_code: input.item_code } : {}),
              ...(input.production_order_code
                ? { production_order_code: input.production_order_code }
                : {}),
              ...(input.lot_no ? { lot_no: input.lot_no } : {}),
            },
          },
        }
      : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.created_by_id ? { created_by_id: input.created_by_id } : {}),
    ...(input.qa_status
      ? {
          qa_staff_approved_by_id:
            input.qa_status === 'approved' ? { not: null } : null,
        }
      : {}),
    ...(input.ipc_status
      ? {
          ipc_staff_approved_by_id:
            input.ipc_status === 'approved' ? { not: null } : null,
        }
      : {}),
    ...(start || end
      ? {
          created_at: {
            ...(start ? { gte: start } : {}),
            ...(end ? { lt: end } : {}),
          },
        }
      : {}),
    ...(input.material_code
      ? { lines: { some: { item_code: input.material_code } } }
      : {}),
    ...(input.has_weights !== undefined
      ? {
          AND: [
            {
              lines: {
                [input.has_weights ? 'some' : 'none']: {
                  details: { some: {} },
                },
              },
            },
          ],
        }
      : {}),
    ...(input.query
      ? {
          OR: [
            { description: { contains: input.query } },
            {
              productionOrder: {
                is: { production_order_code: { contains: input.query } },
              },
            },
            {
              productionOrder: { is: { item_code: { contains: input.query } } },
            },
            { productionOrder: { is: { lot_no: { contains: input.query } } } },
            {
              productionOrder: {
                is: { item: { item_name: { contains: input.query } } },
              },
            },
          ],
        }
      : {}),
  };
  return {
    where,
    date_range: {
      field: 'created_at',
      timezone: 'Asia/Ho_Chi_Minh',
      from_inclusive: start?.toISOString() ?? null,
      to_exclusive: end?.toISOString() ?? null,
    },
  };
}
