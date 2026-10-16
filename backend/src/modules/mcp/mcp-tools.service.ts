import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { mixingRecordsReportInclude } from '../production-orders/exports/mixing-records-report-html';
import { getAuthenticatedDeviationImagePath } from '../production-order-deviations/production-order-deviation-upload.config';

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
  constructor(private readonly prisma: PrismaService) {}

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

  async getProductionOrder(id: number) {
    const order = await this.prisma.productionOrders.findUnique({
      where: { id },
      select: orderSelect,
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy lệnh sản xuất ID ${id}.`);
    }
    return { data: order };
  }

  async getProductionOrderMixingRecords(
    input: GetProductionOrderMixingRecordsInput,
  ) {
    const { data: order } = await this.getProductionOrder(
      input.production_order_id,
    );
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
