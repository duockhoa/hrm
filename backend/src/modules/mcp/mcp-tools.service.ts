import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { mixingRecordsReportInclude } from '../production-orders/exports/mixing-records-report-html';
import { getAuthenticatedDeviationImagePath } from '../production-order-deviations/production-order-deviation-upload.config';
import { ProductionOrderLocalCompletenessService } from '../production-orders/production-order-local-completeness.service';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';
import { recordSections, type RecordSection } from './mcp-record-sections';

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
    take: 1,
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

export interface GetProductionOrderMixingRecordsInput {
  production_order_id: number;
  page: number;
  limit: number;
}

export interface GetProductionOrderDeviationsInput {
  production_order_id: number;
  deviation_id?: number;
  page: number;
  limit: number;
  approval_status?: 'approved' | 'pending';
  query?: string;
}

export interface GetProductionOrderRecordsInput {
  production_order_id: number;
  section: RecordSection;
  record_id?: number;
  from?: string;
  to?: string;
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

  async getProductionOrderDeviations(input: GetProductionOrderDeviationsInput) {
    const order = await this.prisma.productionOrders.findUnique({
      where: { id: input.production_order_id },
      select: {
        id: true,
        production_order_code: true,
        item_code: true,
        item: { select: { item_name: true } },
        lot_no: true,
      },
    });
    if (!order)
      throw new NotFoundException(
        `Không tìm thấy lệnh sản xuất ID ${input.production_order_id}.`,
      );
    const where: Prisma.ProductionOrderDeviationsWhereInput = {
      production_order_id: input.production_order_id,
      deleted_at: null,
      ...(input.deviation_id ? { id: input.deviation_id } : {}),
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
    const skip = (input.page - 1) * input.limit;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.productionOrderDeviations.count({ where }),
      this.prisma.productionOrderDeviations.findMany({
        where,
        select: deviationSelect,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take: input.limit,
      }),
    ]);
    if (input.deviation_id && total === 0)
      throw new NotFoundException(
        `Không tìm thấy sai lệch ID ${input.deviation_id} trong lệnh sản xuất này.`,
      );
    return {
      production_order: order,
      data: rows.map((row) => ({
        ...row,
        images: row.images.map((image) => ({
          ...image,
          image_path: getAuthenticatedDeviationImagePath(image.image_path),
        })),
      })),
      ...(total === 0 ? { message: 'Lệnh sản xuất chưa có sai lệch.' } : {}),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        total_pages: Math.ceil(total / input.limit),
        has_next_page: skip + rows.length < total,
      },
    };
  }

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
    const canReadDeviations = permissions.includes(
      PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
    );
    const order = await this.prisma.productionOrders.findUnique({
      where: { id },
      select: {
        ...orderDetailSelect,
        finishedProductSummaries: {
          take: 1,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          select: recordSections.finished_product_summary.select,
        },
        semiFinishedProductSummaries: {
          take: 1,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          select: recordSections.semi_finished_product_summaries.select,
        },
        materialProcessSummaries: {
          take: 1,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          select: recordSections.material_process_summaries.select,
        },
        factoryReleaseReviews: {
          take: 1,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          select: recordSections.factory_release_reviews.select,
        },
        ...(canReadDeviations
          ? {
              deviations: {
                where: { deleted_at: null },
                take: 3,
                orderBy: [
                  { created_at: 'desc' as const },
                  { id: 'desc' as const },
                ],
                select: {
                  id: true,
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
                  reporter: { select: userSelect },
                  approver: { select: userSelect },
                  created_at: true,
                  updated_at: true,
                },
              },
            }
          : {}),
        _count: {
          select: {
            finishedProductSummaries: true,
            semiFinishedProductSummaries: true,
            materialProcessSummaries: true,
            factoryReleaseReviews: true,
            samplingRecords: true,
            attachments: true,
            ...(canReadDeviations
              ? { deviations: { where: { deleted_at: null } } }
              : {}),
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy lệnh sản xuất ID ${id}.`);
    }
    const {
      item,
      registrationNumber,
      samplingRequests,
      documentControl,
      productionGuide,
      finishedProductSummaries,
      semiFinishedProductSummaries,
      materialProcessSummaries,
      factoryReleaseReviews,
      deviations,
      _count,
      ...fields
    } = order;
    const latestRequest = samplingRequests?.[0] ?? null;
    // Match the frontend: after sending PYCLM, use the lot's saved registration.
    const registrationNumberValue =
      latestRequest?.status === 'sent'
        ? (registrationNumber?.registration_number ?? null)
        : (item?.registration?.registration_number ?? null);
    let activeDocumentControl: Omit<
      NonNullable<typeof documentControl>,
      'deleted_at'
    > | null = null;
    if (documentControl && !documentControl.deleted_at) {
      const { deleted_at: _deletedAt, ...control } = documentControl;
      activeDocumentControl = control;
    }
    return {
      data: {
        ...fields,
        item: item ? { item_name: item.item_name } : null,
        registration_number: registrationNumberValue,
        pyclm: {
          isSent: latestRequest?.status === 'sent',
          status: latestRequest?.status ?? null,
          googleDocUrl: latestRequest?.google_doc_url ?? null,
          sentAt: latestRequest?.sent_at ?? null,
          location: latestRequest?.location ?? null,
          sender: latestRequest?.sender ?? null,
          latestSamplingRequest: latestRequest,
        },
        documentControl: activeDocumentControl,
        productionGuide: productionGuide ?? null,
        completeness: await this.getProductionOrderCompleteness(id),
        summaries: {
          finished_product: {
            total: _count?.finishedProductSummaries ?? 0,
            latest: finishedProductSummaries?.[0] ?? null,
          },
          semi_finished_product: {
            total: _count?.semiFinishedProductSummaries ?? 0,
            latest: semiFinishedProductSummaries?.[0] ?? null,
          },
          material_process: {
            total: _count?.materialProcessSummaries ?? 0,
            latest: materialProcessSummaries?.[0] ?? null,
          },
        },
        factory_release: {
          total: _count?.factoryReleaseReviews ?? 0,
          latest: factoryReleaseReviews?.[0] ?? null,
          note: 'Bản xét duyệt đã lưu và thông tin người duyệt; không tự kết luận lô được phép xuất xưởng.',
        },
        deviations: canReadDeviations
          ? {
              available: true,
              total: _count?.deviations ?? 0,
              latest: deviations ?? [],
              has_more: (_count?.deviations ?? 0) > (deviations?.length ?? 0),
              detail_tool: 'get_production_order_deviations',
            }
          : { available: false, reason: 'permission_required' },
        record_counts: {
          sampling_records: _count?.samplingRecords ?? 0,
          attachments: _count?.attachments ?? 0,
        },
      },
    };
  }

  async getProductionOrderCompleteness(id: number) {
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

  async getProductionOrderRecords(
    input: GetProductionOrderRecordsInput,
    permissions: string[],
  ) {
    const config = recordSections[input.section];
    if (!permissions.includes(config.permission))
      throw new ForbiddenException('Bạn không có quyền sử dụng tool này.');
    const where = {
      ...(input.record_id ? { id: input.record_id } : {}),
      ...(input.from || input.to
        ? {
            [config.dateField]: {
              ...(input.from ? { gte: new Date(input.from) } : {}),
              ...(input.to ? { lte: new Date(input.to) } : {}),
            },
          }
        : {}),
    };
    const skip = (input.page - 1) * input.limit;
    // The relation and select come exclusively from the server-side registry.
    const select = {
      ...orderSelect,
      [config.relation]: config.singleton
        ? { select: config.select }
        : {
            where,
            select: config.select,
            skip,
            take: input.limit,
            orderBy: [{ [config.dateField]: 'desc' }, { id: 'desc' }],
          },
      ...(!config.singleton
        ? { _count: { select: { [config.relation]: { where } } } }
        : {}),
    } as Prisma.ProductionOrdersSelect;
    const order = await this.prisma.productionOrders.findUnique({
      where: { id: input.production_order_id },
      select,
    });
    if (!order)
      throw new NotFoundException(
        `Không tìm thấy lệnh sản xuất ID ${input.production_order_id}.`,
      );
    const result = order as unknown as Record<string, unknown>;
    const { [config.relation]: rows, _count: counts, ...summary } = result;
    let data = rows as Record<string, unknown>[];
    let total =
      (counts as Record<string, number> | undefined)?.[config.relation] ?? 0;
    if (config.singleton) {
      const row = rows as Record<string, unknown> | null;
      const date = row
        ? new Date(row[config.dateField] as string).getTime()
        : 0;
      const matches =
        row &&
        (!input.record_id || row.id === input.record_id) &&
        (!input.from || date >= new Date(input.from).getTime()) &&
        (!input.to || date <= new Date(input.to).getTime());
      total = matches ? 1 : 0;
      data = matches && skip === 0 ? [row] : [];
    }
    if (input.record_id && total === 0)
      throw new NotFoundException(
        'Không tìm thấy bản ghi trong lệnh sản xuất và bộ lọc này.',
      );
    return {
      production_order: summary,
      section: input.section,
      data,
      pagination: this.pagination(input, total, data.length),
    };
  }

  private pagination(
    input: { page: number; limit: number },
    total: number,
    length: number,
  ) {
    return {
      page: input.page,
      limit: input.limit,
      total,
      total_pages: Math.ceil(total / input.limit),
      has_next_page: (input.page - 1) * input.limit + length < total,
    };
  }

  async getProductionOrderMixingRecords(
    input: GetProductionOrderMixingRecordsInput,
  ) {
    const order = await this.prisma.productionOrders.findUnique({
      where: { id: input.production_order_id },
      select: orderSelect,
    });
    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy lệnh sản xuất ID ${input.production_order_id}.`,
      );
    }
    const where: Prisma.ProductionOrderMixingRecordsWhereInput = {
      production_order_id: input.production_order_id,
      record_type: 'mixing',
    };
    const skip = (input.page - 1) * input.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrderMixingRecords.count({ where }),
      this.prisma.productionOrderMixingRecords.findMany({
        where,
        // Use the same saved structure and ordering as the batch report.
        // Only names/usernames are selected for authors and approvers.
        include: mixingRecordsReportInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take: input.limit,
      }),
    ]);

    return {
      production_order: order,
      data,
      ...(total === 0
        ? { message: 'Lệnh sản xuất chưa có phiếu pha chế.' }
        : {}),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        total_pages: Math.ceil(total / input.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }
}
