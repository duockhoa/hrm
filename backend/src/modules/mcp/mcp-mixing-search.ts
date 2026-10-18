import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';

export const mixingSearchSchema = z
  .object({
    item_code: z.string().trim().min(1).max(100).optional(),
    production_order_code: z.string().trim().min(1).max(100).optional(),
    production_order_id: z.number().int().positive().max(2147483647).optional(),
    lot_no: z.string().trim().min(1).max(100).optional(),
    record_type: z.string().trim().min(1).max(50).optional(),
    query: z.string().trim().min(1).max(100).optional(),
    parameter_name: z.string().trim().min(1).max(100).optional(),
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

export const mixingReadSchema = z
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

export type MixingSearchInput = z.output<typeof mixingSearchSchema>;
export type MixingReadInput = z.output<typeof mixingReadSchema>;

export const mixingOrderSelect = {
  id: true,
  production_order_code: true,
  item_code: true,
  lot_no: true,
  item: { select: { item_name: true } },
} satisfies Prisma.ProductionOrdersSelect;

const userSelect = { id: true, name: true, username: true } as const;
export const mixingSummarySelect = {
  id: true,
  production_order_id: true,
  record_type: true,
  template_version: true,
  description: true,
  created_at: true,
  updated_at: true,
  qa_staff_approved_at: true,
  ipc_staff_approved_at: true,
  createdBy: { select: userSelect },
  qaStaffApprovedBy: { select: userSelect },
  ipcStaffApprovedBy: { select: userSelect },
  productionOrder: { select: mixingOrderSelect },
} satisfies Prisma.ProductionOrderMixingRecordsSelect;

export function buildMixingSearch(input: MixingSearchInput) {
  const start = input.date_from
    ? new Date(`${input.date_from}T00:00:00+07:00`)
    : null;
  const end = input.date_to
    ? new Date(new Date(`${input.date_to}T00:00:00+07:00`).getTime() + 86400000)
    : null;
  const where: Prisma.ProductionOrderMixingRecordsWhereInput = {
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
    ...(input.record_type ? { record_type: input.record_type } : {}),
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
    ...(input.parameter_name
      ? {
          stages: {
            some: {
              steps: {
                some: {
                  parameters: {
                    some: {
                      parameter_name: { contains: input.parameter_name },
                    },
                  },
                },
              },
            },
          },
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
