import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { mixingRecordsReportInclude } from '../production-orders/exports/mixing-records-report-html';
import { getAuthenticatedDeviationImagePath } from '../production-order-deviations/production-order-deviation-upload.config';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';
import { recordSections } from './mcp-record-sections';

const orderSelect = {
  id: true,
  production_order_code: true,
  item_code: true,
  item: { select: { item_name: true } },
  lot_no: true,
  status: true,
  type: true,
  planned_quatity: true,
  unit: true,
  creation_date: true,
  start_date: true,
  date_manufacture: true,
  expire_date: true,
} satisfies Prisma.ProductionOrdersSelect;

const userSelect = { id: true, name: true, username: true } as const;

// Keep the search projection small. Only the detail tool loads these relations.
const orderDetailSelect = {
  ...orderSelect,
  origin: true,
  warehouse: true,
  description: true,
  packing_specification: true,
  remarks: true,
  internal_notes: true,
  change_content: true,
  item: {
    select: {
      item_name: true,
      registration: { select: { registration_number: true } },
    },
  },
  registrationNumber: { select: { registration_number: true } },
  documentControl: {
    select: {
      id: true,
      production_order_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      batch_record_issued_at: true,
      batchRecordIssuedBy: { select: userSelect },
      batch_record_received_at: true,
      batchRecordReceivedBy: { select: userSelect },
      warehouse_release_received_at: true,
      warehouseReleaseReceivedBy: { select: userSelect },
      test_certificate_received_at: true,
      testCertificateReceivedBy: { select: userSelect },
    },
  },
  productionGuide: {
    select: {
      id: true,
      original_filename: true,
      mime_type: true,
      file_size: true,
      created_at: true,
      updated_at: true,
    },
  },
  samplingRequests: {
    orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      status: true,
      google_doc_url: true,
      sent_at: true,
      location: true,
      sender: { select: userSelect },
    },
  },
} satisfies Prisma.ProductionOrdersSelect;

export interface SearchProductionOrdersInput {
  query?: string;
  item_code?: string;
  lot_no?: string;
  status?: string;
  page: number;
  limit: number;
}

const deviationSelect = {
  id: true,
  production_order_id: true,
  deviation_content: true,
  cause: true,
  cause_classification: true,
  handling_plan: true,
  handling_result: true,
  affected_quantity: true,
  affected_quantity_unit: true,
  handled_quantity: true,
  handled_quantity_unit: true,
  destroyed_quantity: true,
  destroyed_quantity_unit: true,
  reporter: { select: { id: true, name: true, username: true } },
  approver: { select: { id: true, name: true, username: true } },
  created_at: true,
  updated_at: true,
  images: {
    where: { deleted_at: null },
    select: { id: true, image_path: true, created_at: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ProductionOrderDeviationsSelect;

@Injectable()
export class McpToolsService {
  private readonly logger = new Logger(McpToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly completeness: ProductionOrderLocalCompletenessService,
  ) {}

  async searchProductionOrders(input: SearchProductionOrdersInput) {
    const where: Prisma.ProductionOrdersWhereInput = {
      ...(input.item_code ? { item_code: input.item_code } : {}),
      ...(input.lot_no ? { lot_no: input.lot_no } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.query
        ? {
            OR: [
              { production_order_code: { contains: input.query } },
              { item_code: { contains: input.query } },
              { lot_no: { contains: input.query } },
              { item: { item_name: { contains: input.query } } },
            ],
          }
        : {}),
    };
    const skip = (input.page - 1) * input.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrders.count({ where }),
      this.prisma.productionOrders.findMany({
        where,
        select: orderSelect,
        orderBy: { id: 'desc' },
        skip,
        take: input.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        total_pages: Math.ceil(total / input.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }

  async getProductionOrder(id: number, permissions: string[] = []) {
    const relations: Record<string, unknown> = {};
    for (const config of Object.values(recordSections)) {
      if (!permissions.includes(config.permission)) continue;
      relations[config.relation] = config.singleton
        ? { select: config.select }
        : {
            select: config.select,
            ...('where' in config ? { where: config.where } : {}),
            orderBy: [{ [config.dateField]: 'desc' }, { id: 'desc' }],
          };
    }
    const select: Prisma.ProductionOrdersSelect = {
      ...orderDetailSelect,
      ...relations,
    };
    const canReadDeviations = permissions.includes(
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
    );
    if (canReadDeviations) {
      select.deviations = {
        where: { deleted_at: null },
        select: deviationSelect,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      };
    }
    // All saved record types, including primary-packaging records, belong to the lot.
    select.mixingRecords = {
      include: mixingRecordsReportInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    };
    const result = await this.prisma.productionOrders.findUnique({
      where: { id },
      select,
    });
    if (!result)
      throw new NotFoundException(`Không tìm thấy lệnh sản xuất ID ${id}.`);
    const order = result as unknown as Prisma.ProductionOrdersGetPayload<{
      select: typeof orderDetailSelect;
    }>;
    const raw = result as unknown as Record<string, unknown>;
    type SectionData =
      | { available: true; total: number; data: unknown[] }
      | { available: false; reason: 'permission_required' };
    const sections: Record<string, SectionData> = {};
    for (const [key, config] of Object.entries(recordSections)) {
      if (!permissions.includes(config.permission)) {
        sections[key] = { available: false, reason: 'permission_required' };
        continue;
      }
      const records = raw[config.relation];
      const data = config.singleton
        ? records
          ? [records]
          : []
        : ((records as unknown[]) ?? []);
      sections[key] = { available: true, total: data.length, data };
    }
    // Only normalize image references in the authorized deviation payload.
    const deviations = canReadDeviations
      ? (
          (raw.deviations ?? []) as Prisma.ProductionOrderDeviationsGetPayload<{
            select: typeof deviationSelect;
          }>[]
        ).map((row) => ({
          ...row,
          images: row.images.map((image) => ({
            ...image,
            image_path: getAuthenticatedDeviationImagePath(image.image_path),
          })),
        }))
      : [];
    sections.deviations = canReadDeviations
      ? { available: true, total: deviations.length, data: deviations }
      : { available: false, reason: 'permission_required' };
    const mixingRecords = (raw.mixingRecords ?? []) as unknown[];
    sections.mixing_records = {
      available: true,
      total: mixingRecords.length,
      data: mixingRecords,
    };

    const latestRequest = order.samplingRequests?.[0] ?? null;
    const { deleted_at: _deletedAt, ...documentControl } =
      order.documentControl ?? {};
    // Whitelist the top-level fields so related data is returned once, under sections.
    const fields = Object.fromEntries(
      Object.keys(orderSelect)
        .filter((key) => key !== 'item')
        .map((key) => [key, raw[key]]),
    );
    return {
      data: {
        ...fields,
        origin: order.origin,
        warehouse: order.warehouse,
        description: order.description,
        packing_specification: order.packing_specification,
        remarks: order.remarks,
        internal_notes: order.internal_notes,
        change_content: order.change_content,
        item: order.item ? { item_name: order.item.item_name } : null,
        registration_number:
          latestRequest?.status === 'sent'
            ? (order.registrationNumber?.registration_number ?? null)
            : (order.item?.registration?.registration_number ?? null),
        pyclm: {
          isSent: latestRequest?.status === 'sent',
          status: latestRequest?.status ?? null,
          googleDocUrl: latestRequest?.google_doc_url ?? null,
          sentAt: latestRequest?.sent_at ?? null,
          location: latestRequest?.location ?? null,
          sender: latestRequest?.sender ?? null,
        },
        documentControl:
          order.documentControl && !order.documentControl.deleted_at
            ? documentControl
            : null,
        productionGuide: order.productionGuide
          ? {
              ...order.productionGuide,
              file_path: `/production-orders/${id}/production-guide/file`,
            }
          : null,
        completeness: await this.getProductionOrderCompleteness(id),
        sections,
      },
    };
  }

  private async getProductionOrderCompleteness(id: number) {
    try {
      return {
        available: true,
        ...(await this.completeness.findByProductionOrder(id)),
        note: 'Mức độ có dữ liệu trong hồ sơ, không phải kết luận đạt chất lượng hoặc phê duyệt xuất xưởng.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(error instanceof Error ? error.stack : String(error));
      return {
        available: false,
        reason: 'Không thể kiểm tra mức độ đầy đủ hồ sơ lúc này.',
      };
    }
  }
}
