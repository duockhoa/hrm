import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

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

@Injectable()
export class McpToolsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
