import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ExportFinishedProductSummariesQueryDto } from './dto/export-finished-product-summaries.query.dto';
import { ExportItemsQueryDto } from './dto/export-items.query.dto';

const ITEM_EXPORT_SELECT = {
  item_code: true,
  item_name: true,
  unit: true,
  dk_code: true,
  registration_id: true,
  registration: true,
  created_at: true,
  update_at: true,
  deleted_at: true,
} satisfies Prisma.ItemsSelect;

const USER_EXPORT_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const FINISHED_PRODUCT_SUMMARY_EXPORT_INCLUDE = {
  createdBy: {
    select: USER_EXPORT_SELECT,
  },
  productionOrder: {
    select: {
      id: true,
      item_code: true,
      status: true,
      type: true,
      planned_quatity: true,
      creation_date: true,
      origin: true,
      warehouse: true,
      unit: true,
      start_date: true,
      description: true,
      date_manufacture: true,
      expire_date: true,
      lot_no: true,
      packing_specification: true,
      production_order_code: true,
      remarks: true,
      internal_notes: true,
      item: {
        select: ITEM_EXPORT_SELECT,
      },
      samplingRequests: {
        orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
        take: 1,
        select: {
          id: true,
          production_order_id: true,
          sender_id: true,
          location: true,
          google_doc_url: true,
          status: true,
          sent_at: true,
          created_at: true,
          updated_at: true,
          sender: {
            select: USER_EXPORT_SELECT,
          },
        },
      },
      documentControl: {
        select: {
          id: true,
          production_order_id: true,
          batch_record_issued_by_id: true,
          batch_record_issued_at: true,
          batch_record_received_by_id: true,
          batch_record_received_at: true,
          test_certificate_received_by_id: true,
          test_certificate_received_at: true,
          warehouse_release_received_by_id: true,
          warehouse_release_received_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          batchRecordIssuedBy: { select: USER_EXPORT_SELECT },
          batchRecordReceivedBy: { select: USER_EXPORT_SELECT },
          testCertificateReceivedBy: { select: USER_EXPORT_SELECT },
          warehouseReleaseReceivedBy: { select: USER_EXPORT_SELECT },
        },
      },
      deviations: {
        where: { deleted_at: null },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          production_order_id: true,
          deviation_content: true,
          handling_plan: true,
          handling_result: true,
          cause: true,
          cause_classification: true,
          affected_quantity: true,
          affected_quantity_unit: true,
          handled_quantity: true,
          handled_quantity_unit: true,
          destroyed_quantity: true,
          destroyed_quantity_unit: true,
          approver_id: true,
          reporter_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          approver: { select: USER_EXPORT_SELECT },
          reporter: { select: USER_EXPORT_SELECT },
          images: {
            where: { deleted_at: null },
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              deviation_id: true,
              image_path: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderFinishedProductSummariesInclude;

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportItems(query: ExportItemsQueryDto) {
    const where: Prisma.ItemsWhereInput = {};

    if (query.updated_from) {
      where.update_at = { gte: new Date(query.updated_from) };
    }

    if (query.include_deleted !== 'true') {
      where.deleted_at = null;
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.items.count({ where }),
      this.prisma.items.findMany({
        where,
        select: ITEM_EXPORT_SELECT,
        orderBy: [{ created_at: 'asc' }, { item_code: 'asc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }

  async exportFinishedProductSummaries(
    query: ExportFinishedProductSummariesQueryDto,
  ) {
    const where: Prisma.ProductionOrderFinishedProductSummariesWhereInput = {};

    if (query.updated_from) {
      where.updated_at = { gte: new Date(query.updated_from) };
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrderFinishedProductSummaries.count({ where }),
      this.prisma.productionOrderFinishedProductSummaries.findMany({
        where,
        include: FINISHED_PRODUCT_SUMMARY_EXPORT_INCLUDE,
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }
}
