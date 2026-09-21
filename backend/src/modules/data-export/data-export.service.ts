import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ExportFinishedProductSummariesQueryDto } from './dto/export-finished-product-summaries.query.dto';
import { ExportItemsQueryDto } from './dto/export-items.query.dto';
import { ExportPostSecondaryPackagingSummariesQueryDto } from './dto/export-post-secondary-packaging-summaries.query.dto';
import { ExportSemiFinishedProductSummariesQueryDto } from './dto/export-semi-finished-product-summaries.query.dto';
import { ExportSemiFinishedWeightChecksQueryDto } from './dto/export-semi-finished-weight-checks.query.dto';
import { ExportVolumeChecksQueryDto } from './dto/export-volume-checks.query.dto';

const ITEM_EXPORT_SELECT = {
  item_code: true,
  item_name: true,
  unit: true,
  dk_code: true,
  registration_id: true,
  registration: true,
  productionSpecification: {
    select: {
      product_line_id: true,
      productLine: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
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

const POST_SECONDARY_PACKAGING_ITEM_EXPORT_SELECT = {
  item_code: true,
  item_name: true,
  unit: true,
  dk_code: true,
  registration_id: true,
  registration: true,
  productionSpecification: {
    select: {
      product_line_id: true,
      productLine: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  created_at: true,
  update_at: true,
  deleted_at: true,
} satisfies Prisma.ItemsSelect;

const POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT = {
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
  change_content: true,
  item: { select: POST_SECONDARY_PACKAGING_ITEM_EXPORT_SELECT },
} satisfies Prisma.ProductionOrdersSelect;

const POST_SECONDARY_PACKAGING_SUMMARY_EXPORT_INCLUDE = {
  createdBy: { select: USER_EXPORT_SELECT },
  productionOrder: {
    select: POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT,
  },
  semiFinishedProductOrder: {
    select: POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT,
  },
  pendingProcessItems: {
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      summary_id: true,
      pending_quantity: true,
      pending_reason: true,
      processing_plan: true,
      created_by_id: true,
      created_at: true,
      updated_at: true,
      createdBy: { select: USER_EXPORT_SELECT },
    },
  },
  pendingCancellationItems: {
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      summary_id: true,
      cancellation_quantity: true,
      cancellation_reason: true,
      cancellation_plan: true,
      created_by_id: true,
      created_at: true,
      updated_at: true,
      createdBy: { select: USER_EXPORT_SELECT },
    },
  },
} satisfies Prisma.ProductionOrderPostSecondaryPackagingSummariesInclude;

const VOLUME_CHECK_EXPORT_INCLUDE = {
  createdBy: { select: USER_EXPORT_SELECT },
  productionOrder: {
    select: POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT,
  },
  images: {
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      volume_check_id: true,
      image_path: true,
      created_by_id: true,
      created_at: true,
      updated_at: true,
      createdBy: { select: USER_EXPORT_SELECT },
    },
  },
} satisfies Prisma.ProductionOrderVolumeChecksInclude;

const SEMI_FINISHED_WEIGHT_CHECK_EXPORT_INCLUDE = {
  createdBy: { select: USER_EXPORT_SELECT },
  productionOrder: {
    select: POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT,
  },
};

const SEMI_FINISHED_PRODUCT_SUMMARY_EXPORT_INCLUDE = {
  createdBy: { select: USER_EXPORT_SELECT },
  productionOrder: {
    select: {
      ...POST_SECONDARY_PACKAGING_PRODUCTION_ORDER_SELECT,
      registrationNumber: {
        select: {
          id: true,
          production_order_id: true,
          registration_id: true,
          registration_number: true,
          created_at: true,
          updated_at: true,
        },
      },
      hygieneChecks: {
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        take: 1,
        select: {
          created_at: true,
        },
      },
      deviations: {
        where: { deleted_at: null },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        select: {
          deviation_content: true,
        },
      },
      samplingRecords: {
        select: {
          quantity: true,
        },
      },
      samplingRequests: {
        orderBy: [{ sent_at: 'desc' }, { id: 'desc' }],
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
          sender: { select: USER_EXPORT_SELECT },
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
    },
  },
} satisfies Prisma.ProductionOrderSemiFinishedProductSummariesInclude;

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
      change_content: true,
      productionGuide: {
        select: {
          id: true,
          production_order_id: true,
          original_filename: true,
          mime_type: true,
          file_size: true,
          created_at: true,
          updated_at: true,
        },
      },
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
      samplingRecords: {
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          production_order_id: true,
          sampling_type: true,
          quantity: true,
          unit: true,
          created_by_id: true,
          created_at: true,
          updated_at: true,
          createdBy: {
            select: USER_EXPORT_SELECT,
          },
        },
      },
      lineClearanceChecks: {
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        take: 1,
        select: {
          id: true,
          created_at: true,
        },
      },
      factoryReleaseReviews: {
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        take: 1,
        select: {
          id: true,
          created_at: true,
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

  async exportPostSecondaryPackagingSummaries(
    query: ExportPostSecondaryPackagingSummariesQueryDto,
  ) {
    const where: Prisma.ProductionOrderPostSecondaryPackagingSummariesWhereInput =
      {};

    if (query.updated_from) {
      where.updated_at = { gte: new Date(query.updated_from) };
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrderPostSecondaryPackagingSummaries.count({
        where,
      }),
      this.prisma.productionOrderPostSecondaryPackagingSummaries.findMany({
        where,
        include: POST_SECONDARY_PACKAGING_SUMMARY_EXPORT_INCLUDE,
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

  async exportVolumeChecks(query: ExportVolumeChecksQueryDto) {
    const where: Prisma.ProductionOrderVolumeChecksWhereInput = {};

    if (query.updated_from) {
      where.updated_at = { gte: new Date(query.updated_from) };
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrderVolumeChecks.count({ where }),
      this.prisma.productionOrderVolumeChecks.findMany({
        where,
        include: VOLUME_CHECK_EXPORT_INCLUDE,
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

  async exportSemiFinishedProductSummaries(
    query: ExportSemiFinishedProductSummariesQueryDto,
  ) {
    const where: Prisma.ProductionOrderSemiFinishedProductSummariesWhereInput =
      {};

    if (query.updated_from) {
      where.updated_at = { gte: new Date(query.updated_from) };
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionOrderSemiFinishedProductSummaries.count({ where }),
      this.prisma.productionOrderSemiFinishedProductSummaries.findMany({
        where,
        include: SEMI_FINISHED_PRODUCT_SUMMARY_EXPORT_INCLUDE,
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data: data.map(({ productionOrder, ...summary }) => {
        const {
          hygieneChecks,
          deviations,
          samplingRecords,
          ...productionOrderData
        } = productionOrder;

        return {
          ...summary,
          productionOrder: {
            ...productionOrderData,
            first_hygiene_check_at: hygieneChecks[0]?.created_at ?? null,
            deviation_contents: deviations
              .map(({ deviation_content }) => deviation_content.trim())
              .filter(Boolean)
              .join(', '),
            total_sampling_quantity: samplingRecords.reduce(
              (total, { quantity }) => total + Number(quantity),
              0,
            ),
          },
        };
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }

  async exportSemiFinishedWeightChecks(
    query: ExportSemiFinishedWeightChecksQueryDto,
  ) {
    const netWhere: Prisma.ProductionOrderSemiFinishedProductNetWeightChecksWhereInput =
      {};
    const grossWhere: Prisma.ProductionOrderSemiFinishedProductGrossWeightChecksWhereInput =
      {};

    if (query.updated_from) {
      const updatedAt = { gte: new Date(query.updated_from) };
      netWhere.updated_at = updatedAt;
      grossWhere.updated_at = updatedAt;
    }

    const skip = (query.page - 1) * query.limit;
    // To form one consistently paginated, time-ordered list, each source only
    // needs its first (skip + limit) rows before the merged list is sliced.
    const sourceTake = skip + query.limit;

    const [netTotal, grossTotal, netChecks, grossChecks] =
      await this.prisma.$transaction([
        this.prisma.productionOrderSemiFinishedProductNetWeightChecks.count({
          where: netWhere,
        }),
        this.prisma.productionOrderSemiFinishedProductGrossWeightChecks.count({
          where: grossWhere,
        }),
        this.prisma.productionOrderSemiFinishedProductNetWeightChecks.findMany({
          where: netWhere,
          include: SEMI_FINISHED_WEIGHT_CHECK_EXPORT_INCLUDE,
          orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          take: sourceTake,
        }),
        this.prisma.productionOrderSemiFinishedProductGrossWeightChecks.findMany(
          {
            where: grossWhere,
            include: SEMI_FINISHED_WEIGHT_CHECK_EXPORT_INCLUDE,
            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
            take: sourceTake,
          },
        ),
      ]);

    const merged = [
      ...netChecks.map((check) => this.normalizeWeightCheck(check, 'net')),
      ...grossChecks.map((check) => this.normalizeWeightCheck(check, 'gross')),
    ].sort((left, right) => {
      const dateDifference =
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime();

      if (dateDifference !== 0) return dateDifference;
      if (left.id !== right.id) return left.id - right.id;
      return left.check_type.localeCompare(right.check_type);
    });

    const total = netTotal + grossTotal;
    const data = merged.slice(skip, skip + query.limit);

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

  private normalizeWeightCheck(
    check: Record<string, any>,
    checkType: 'net' | 'gross',
  ) {
    const weightSuffix = `${checkType}_weight`;

    return {
      id: check.id,
      check_type: checkType,
      production_order_id: check.production_order_id,
      lower_limit: this.toExportNumber(check.lower_limit),
      upper_limit: this.toExportNumber(check.upper_limit),
      requirement: check.requirement,
      dosage_form_stage: check.dosage_form_stage,
      unit: check.unit,
      created_by_id: check.created_by_id,
      created_at: check.created_at,
      updated_at: check.updated_at,
      createdBy: check.createdBy,
      productionOrder: check.productionOrder,
      unit_1_weight: this.toExportNumber(check[`unit_1_${weightSuffix}`]),
      unit_2_weight: this.toExportNumber(check[`unit_2_${weightSuffix}`]),
      unit_3_weight: this.toExportNumber(check[`unit_3_${weightSuffix}`]),
      unit_4_weight: this.toExportNumber(check[`unit_4_${weightSuffix}`]),
      unit_5_weight: this.toExportNumber(check[`unit_5_${weightSuffix}`]),
      unit_6_weight: this.toExportNumber(check[`unit_6_${weightSuffix}`]),
      unit_7_weight: this.toExportNumber(check[`unit_7_${weightSuffix}`]),
      unit_8_weight: this.toExportNumber(check[`unit_8_${weightSuffix}`]),
      unit_9_weight: this.toExportNumber(check[`unit_9_${weightSuffix}`]),
      unit_10_weight: this.toExportNumber(
        check[`unit_10_${weightSuffix}`],
      ),
    };
  }

  private toExportNumber(value: unknown): number | null | undefined | unknown {
    if (value === null || value === undefined) return value;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
  }
}
