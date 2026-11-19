import { Injectable, NotFoundException } from '@nestjs/common';
import * as z from 'zod/v4';
import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProductionOrderHistoryService } from '../production-orders/production-order-history.service';
import {
  PRODUCTION_ORDER_HISTORY_RESOURCES,
  ProductionOrderHistoryResource,
} from '../production-orders/production-order-history.resources';

const paging = {
  page: z.number().int().min(1).max(1000000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
};
export const auditSearchSchema = z
  .object({
    ...paging,
    entity_type: z.string().trim().min(1).max(100).optional(),
    entity_id: z
      .string()
      .regex(/^[1-9]\d{0,18}$/)
      .refine(
        (value) =>
          /^[1-9]\d{0,18}$/.test(value) &&
          BigInt(value) <= 9223372036854775807n,
        'ID exceeds bigint range',
      )
      .optional(),
    entity_key: z.string().trim().min(1).max(191).optional(),
    action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
    keyword: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const itemEditHistorySchema = z
  .object({
    item_code: z.string().trim().min(1).max(191),
    ...paging,
  })
  .strict();

const resources = Object.keys(PRODUCTION_ORDER_HISTORY_RESOURCES) as [
  ProductionOrderHistoryResource,
  ...ProductionOrderHistoryResource[],
];
export const productionOrderEditHistorySchema = z
  .object({
    resource: z
      .enum(resources)
      .describe(
        'production-order cho thông tin lệnh; các resource khác cho từng loại phiếu.',
      ),
    record_id: z.number().int().positive().max(2147483647),
    scope: z.enum(['record', 'production-order']).default('record'),
    ...paging,
  })
  .strict();

@Injectable()
export class McpAuditHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly orderHistory: ProductionOrderHistoryService,
  ) {}

  search(input: z.infer<typeof auditSearchSchema>) {
    return this.audit.findAll(input);
  }

  async itemHistory({
    item_code,
    ...page
  }: z.infer<typeof itemEditHistorySchema>) {
    const item = await this.prisma.items.findUnique({
      where: { item_code },
      select: { item_code: true, deleted_at: true },
    });
    if (!item || item.deleted_at)
      throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.audit.findForItem(item.item_code, page);
  }

  productionOrderHistory(
    {
      resource,
      record_id,
      ...page
    }: z.infer<typeof productionOrderEditHistorySchema>,
    permissions: string[],
  ) {
    return this.orderHistory.findHistory(resource, record_id, page, {
      permissions,
    });
  }
}
