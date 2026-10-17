import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';

export const deviationSearchSchema = z
  .object({
    mode: z.enum(['count', 'list']).default('list'),
    today: z.boolean().default(false),
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    item_code: z.string().trim().min(1).max(100).optional(),
    lot_no: z.string().trim().min(1).max(100).optional(),
    production_order_id: z.number().int().positive().max(2147483647).optional(),
    approval_status: z.enum(['approved', 'pending']).optional(),
    query: z.string().trim().min(1).max(100).optional(),
    page: z.number().int().min(1).max(1000000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((input) => !input.today || !(input.date_from || input.date_to), {
    message: 'today không được kết hợp với date_from/date_to.',
  })
  .refine(
    (input) =>
      !input.date_from || !input.date_to || input.date_from <= input.date_to,
    {
      message: 'date_from phải nhỏ hơn hoặc bằng date_to.',
    },
  );

export type SearchProductionOrderDeviationsInput = z.output<
  typeof deviationSearchSchema
>;

// Vietnam uses UTC+07:00 throughout the year. Do not depend on the host timezone.
export function buildDeviationSearch(
  input: SearchProductionOrderDeviationsInput,
  now = new Date(),
) {
  const vietnamDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const from = input.today ? vietnamDate : input.date_from;
  const to = input.today ? vietnamDate : input.date_to;
  const start = from ? new Date(`${from}T00:00:00+07:00`) : null;
  const end = to
    ? new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const where: Prisma.ProductionOrderDeviationsWhereInput = {
    deleted_at: null,
    ...(input.production_order_id
      ? { production_order_id: input.production_order_id }
      : {}),
    ...(input.item_code || input.lot_no
      ? {
          productionOrder: {
            is: {
              ...(input.item_code ? { item_code: input.item_code } : {}),
              ...(input.lot_no ? { lot_no: input.lot_no } : {}),
            },
          },
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
    ...(input.approval_status === 'approved'
      ? { approver_id: { not: null } }
      : {}),
    ...(input.approval_status === 'pending' ? { approver_id: null } : {}),
    ...(input.query
      ? {
          OR: [
            { deviation_content: { contains: input.query } },
            { cause: { contains: input.query } },
            { handling_plan: { contains: input.query } },
            { handling_result: { contains: input.query } },
          ],
        }
      : {}),
  };
  return {
    where,
    date_range: {
      field: 'created_at',
      timezone: 'Asia/Ho_Chi_Minh',
      date_from: from ?? null,
      date_to: to ?? null,
      from_inclusive: start?.toISOString() ?? null,
      to_exclusive: end?.toISOString() ?? null,
    },
  };
}
