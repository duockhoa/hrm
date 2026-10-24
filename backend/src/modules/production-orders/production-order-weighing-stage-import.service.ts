import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  ProductionOrdersService,
  type ProductionOrderLineWithRelations,
} from './production-orders.service';
import { ProductionOrderWeighingRecordLinesService } from './production-order-weighing-record-lines.service';

@Injectable()
export class ProductionOrderWeighingStageImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: ProductionOrdersService,
    private readonly lines: ProductionOrderWeighingRecordLinesService,
  ) {}

  private async source(recordId: number) {
    const record = await this.prisma.productionOrderWeighingRecords.findUnique({
      where: { id: recordId },
      select: { production_order_id: true },
    });
    if (!record)
      throw new NotFoundException('Production order weighing record not found');
    return this.orders.findProductionOrderLines(record.production_order_id);
  }

  private materials(lines: ProductionOrderLineWithRelations[]) {
    return lines.filter(
      (line) =>
        line.ItemType === 'pit_Item' &&
        Number.isInteger(line.StageID) &&
        line.StageID! >= 0,
    );
  }

  async stages(recordId: number) {
    const source = this.materials(await this.source(recordId));
    const imported =
      await this.prisma.productionOrderWeighingRecordLines.findMany({
        where: { production_order_weighing_record_id: recordId },
        select: { source_stage_id: true },
      });
    const importedIds = new Set(imported.map((row) => row.source_stage_id));
    const stages = new Map<
      number,
      { id: number; name: string; material_count: number; imported: boolean }
    >();
    for (const line of source) {
      const id = line.StageID!;
      const stage = stages.get(id) ?? {
        id,
        name: String(line.ProductionOrdersStage?.Name ?? id),
        material_count: 0,
        imported: importedIds.has(id),
      };
      stage.material_count++;
      stages.set(id, stage);
    }
    return [...stages.values()];
  }

  async importStage(recordId: number, dto: unknown) {
    if (
      !dto ||
      typeof dto !== 'object' ||
      Array.isArray(dto) ||
      Object.keys(dto).some((key) => key !== 'stage_id')
    ) {
      throw new BadRequestException('Only stage_id is allowed');
    }
    const stageId = (dto as { stage_id?: unknown }).stage_id;
    if (
      typeof stageId !== 'number' ||
      !Number.isInteger(stageId) ||
      stageId < 0 ||
      stageId > 2147483647
    ) {
      throw new BadRequestException('stage_id must be a non-negative integer');
    }
    const selected = this.materials(await this.source(recordId)).filter(
      (line) => line.StageID === stageId,
    );
    if (!selected.length)
      throw new BadRequestException('Selected stage has no material lines');
    const rows = selected.map((line) => {
      let quantity: Prisma.Decimal;
      try {
        quantity = new Prisma.Decimal(String(line.PlannedQuantity));
      } catch {
        throw new BadRequestException(
          'Source material has an invalid planned quantity',
        );
      }
      if (
        !quantity.isFinite() ||
        !quantity.greaterThan(0) ||
        quantity.decimalPlaces() > 6 ||
        quantity.greaterThan('999999999999.999999')
      ) {
        throw new BadRequestException(
          'Source material quantity must fit positive Decimal(18,6)',
        );
      }
      return {
        source_line_number:
          line.LineNumber == null ? null : Number(line.LineNumber),
        source_stage_id: stageId,
        stage_name: String(line.ProductionOrdersStage?.Name ?? stageId),
        item_code: String(line.ItemNo ?? ''),
        item_name: String(line.ItemName ?? ''),
        lot_no: line.U_SL == null ? null : String(line.U_SL),
        planned_quantity: quantity.toFixed(),
        unit: String(line.UnitOfMeasurement?.Code ?? line.UoMCode ?? ''),
        note: null,
      };
    });
    return this.lines.importStage(recordId, stageId, rows);
  }
}
