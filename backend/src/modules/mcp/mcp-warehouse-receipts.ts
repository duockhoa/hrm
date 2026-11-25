import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as z from 'zod/v4';
import {
  warehouseReceiptScopeForUser,
  type ReceiptScopeUser,
} from '../../access/warehouse-receipt-scope';
import { literalContains } from '../../common/utils/record-list-query';
import type { PrismaService } from '../../prisma.service';

const vietnamTimeZone = 'Asia/Ho_Chi_Minh';
const vietnamDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: vietnamTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const date = z.iso.date().refine((value) => value >= '1000-01-01');
const receiptId = z.number().int().positive().max(2147483647);

export const receiptSearchSchema = z
  .object({
    item_code: z
      .string()
      .trim()
      .min(1)
      .max(191)
      .optional()
      .describe('Mã hàng chính xác.'),
    lot_number: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe('Tìm một phần số lô hoặc số lô nhà sản xuất.'),
    search: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe('Tìm cụm từ trong mã hàng, tên hàng hoặc số lô.'),
    today: z.boolean().default(false),
    date_from: date.optional(),
    date_to: date.optional(),
    page: z.number().int().min(1).max(1000000).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.today && (input.date_from || input.date_to))
      ctx.addIssue({
        code: 'custom',
        message: 'today không kết hợp với date_from/date_to.',
      });
    if (input.date_from && input.date_to && input.date_from > input.date_to)
      ctx.addIssue({
        code: 'custom',
        message: 'date_from phải trước hoặc bằng date_to.',
      });
  });

export const receiptReadSchema = z.object({ id: receiptId }).strict();
export type ReceiptSearchInput = z.output<typeof receiptSearchSchema>;

const personSelect = { id: true, name: true, username: true } as const;
const receiptSummarySelect = {
  id: true,
  received_at: true,
  item_code: true,
  item: { select: { item_name: true } },
  lot_number: true,
  manufacturer_lot_number: true,
  expiry_date: true,
  quantity: true,
  unit: true,
  enteredBy: { select: personSelect },
  samplingRequest: { select: { id: true, sent_at: true } },
  sapConfirmation: { select: { confirmed_at: true } },
} satisfies Prisma.WarehouseReceiptItemsSelect;

const receiptDetailSelect = {
  ...receiptSummarySelect,
  actual_quantity: true,
  counting_method: true,
  sensory_passed: true,
  packaging_specification: true,
  supplier_code: true,
  supplier_name: true,
  supplier: { select: { card_name: true } },
  manufacturer_code: true,
  manufacturer_name: true,
  manufacturer: { select: { manufacturer_name: true } },
  note: true,
  created_at: true,
  updated_at: true,
  samplingRequest: {
    select: {
      id: true,
      sent_at: true,
      location: true,
      google_doc_url: true,
      sender: { select: personSelect },
    },
  },
  sapConfirmation: {
    select: { confirmed_at: true, confirmedBy: { select: personSelect } },
  },
  attachments: {
    orderBy: { id: 'asc' },
    take: 50,
    select: {
      id: true,
      attachment_type: true,
      original_name: true,
      file_path: true,
    },
  },
  _count: { select: { attachments: true } },
} satisfies Prisma.WarehouseReceiptItemsSelect;

type ReceiptDb = Pick<PrismaService, 'warehouseReceiptItems' | '$transaction'>;

function readableReceipts(
  user: ReceiptScopeUser,
): { entered_by_id?: number } {
  const scope = warehouseReceiptScopeForUser(user);
  if (scope.kind === 'none')
    throw new ForbiddenException('Bạn không có quyền xem Kiểm hàng nhập kho.');
  return scope.kind === 'own' ? { entered_by_id: scope.userId } : {};
}

export async function searchWarehouseReceiptItems(
  db: ReceiptDb,
  input: ReceiptSearchInput,
  user: ReceiptScopeUser,
) {
  const where: Prisma.WarehouseReceiptItemsWhereInput = readableReceipts(user);
  const today = input.today ? vietnamDate.format() : undefined;
  const from = today ?? input.date_from;
  const to = today ?? input.date_to;
  if (from || to) {
    const end = to ? new Date(`${to}T00:00:00+07:00`) : undefined;
    end?.setUTCDate(end.getUTCDate() + 1);
    where.received_at = {
      gte: from ? new Date(`${from}T00:00:00+07:00`) : undefined,
      lt: end,
    };
  }
  if (input.item_code) where.item_code = input.item_code;
  const lotFilter = (value: string) => ({
    OR: [
      { lot_number: literalContains(value) },
      { manufacturer_lot_number: literalContains(value) },
    ],
  });
  const conditions: Prisma.WarehouseReceiptItemsWhereInput[] = [];
  if (input.lot_number) conditions.push(lotFilter(input.lot_number));
  if (input.search) {
    const contains = literalContains(input.search);
    conditions.push({
      OR: [
        { item_code: contains },
        { item: { is: { item_name: contains } } },
        lotFilter(input.search),
      ],
    });
  }
  if (conditions.length) where.AND = conditions;
  const { page, limit } = input;
  const [data, total] = await db.$transaction(
    [
      db.warehouseReceiptItems.findMany({
        where,
        select: receiptSummarySelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ received_at: 'desc' }, { id: 'desc' }],
      }),
      db.warehouseReceiptItems.count({ where }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return {
    data,
    pagination: { page, limit, total, has_more: page * limit < total },
    date_filter: {
      field: 'received_at',
      timezone: vietnamTimeZone,
      date_from: from ?? null,
      date_to: to ?? null,
    },
  };
}

export async function getWarehouseReceiptItem(
  db: ReceiptDb,
  id: number,
  user: ReceiptScopeUser,
) {
  const row = await db.warehouseReceiptItems.findUnique({
    where: { id, ...readableReceipts(user) },
    select: receiptDetailSelect,
  });
  if (!row)
    throw new NotFoundException('Không tìm thấy dòng Kiểm hàng nhập kho.');
  const { _count, attachments, ...receipt } = row;
  return {
    ...receipt,
    attachments,
    attachments_total: _count.attachments,
    attachments_truncated: _count.attachments > attachments.length,
  };
}
