import { Injectable, NotFoundException } from '@nestjs/common';
import * as z from 'zod/v4';
import { PrismaService } from '../../prisma.service';
import { assertProductionOrderInScope } from '../../access/production-order-scope';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import type {
  SapProductionOrderResponse,
  SapUnitOfMeasurement,
} from '../production-orders/production-orders.service';

export const warehouseReleaseReadSchema = z
  .object({
    production_order_id: z.number().int().positive().max(2147483647),
    page: z.number().int().min(1).max(1000000).default(1),
    limit: z.number().int().min(1).max(100).default(100),
  })
  .strict();

@Injectable()
export class McpWarehouseReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sap: SapB1ServiceLayerClient,
  ) {}

  async getWarehouseRelease(
    input: z.output<typeof warehouseReleaseReadSchema>,
  ) {
    // Authorize the local lot before making any SAP request.
    await assertProductionOrderInScope(this.prisma, input.production_order_id);
    const productionOrder = await this.prisma.productionOrders.findUnique({
      where: { id: input.production_order_id },
      select: {
        id: true,
        production_order_code: true,
        item_code: true,
        lot_no: true,
        status: true,
        item: { select: { item_name: true } },
      },
    });
    if (!productionOrder)
      throw new NotFoundException('Production order not found');
    const [order, units] = await Promise.all([
      this.sap.getProductionOrderById<SapProductionOrderResponse>(
        input.production_order_id,
      ),
      this.sap.getUnitOfMeasurements<SapUnitOfMeasurement>(),
    ]);
    const lines = order.ProductionOrderLines ?? [];
    const stages = new Map(
      (order.ProductionOrdersStages ?? []).map((stage) => [
        stage.StageID,
        stage,
      ]),
    );
    const unitsById = new Map(units.map((unit) => [unit.AbsEntry, unit]));
    const skip = (input.page - 1) * input.limit;
    const data = lines.slice(skip, skip + input.limit).map((line) => ({
      ...line,
      ProductionOrdersStage:
        typeof line.StageID === 'number'
          ? (stages.get(line.StageID) ?? null)
          : null,
      UnitOfMeasurement:
        typeof line.UoMEntry === 'number'
          ? (unitsById.get(line.UoMEntry) ?? null)
          : null,
    }));
    return {
      document_type: 'warehouse_release',
      document_label: 'Phiếu xuất kho',
      source: 'SAP Business One / ProductionOrders.ProductionOrderLines',
      description:
        'Dữ liệu phiếu xuất kho của lô sản xuất, tương ứng ProductionOrderLines trên giao diện EBR. Các trường số lượng giữ nguyên ý nghĩa từ SAP, không suy diễn lượng kế hoạch thành lượng đã xuất.',
      production_order: productionOrder,
      data,
      pagination: {
        page: input.page,
        limit: input.limit,
        total: lines.length,
        total_pages: Math.ceil(lines.length / input.limit),
        has_next_page: skip + data.length < lines.length,
      },
    };
  }
}
