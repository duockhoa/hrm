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
    const rows = selected.map((line) => this.toRow(line));
    return this.lines.importStage(recordId, stageId, rows);
  }

  async sourceMaterials(recordId: number) {
    const source = await this.source(recordId);
    const imported =
      await this.prisma.productionOrderWeighingRecordLines.findMany({
        where: { production_order_weighing_record_id: recordId },
        select: { source_line_number: true },
      });
    const numbers = new Set(imported.map((row) => row.source_line_number));
    return source
      .filter((line) => line.ItemType === 'pit_Item')
      .map((line) => {
        const row = this.toRow(line);
        return {
          ...row,
          imported:
            row.source_line_number !== null &&
            numbers.has(row.source_line_number),
        };
      });
  }

  async importLines(recordId: number, dto: unknown) {
    if (
      !dto ||
      typeof dto !== 'object' ||
      Array.isArray(dto) ||
      Object.keys(dto).some((key) => key !== 'line_numbers')
    ) {
      throw new BadRequestException('Only line_numbers is allowed');
    }
    const numbers = (dto as { line_numbers?: unknown }).line_numbers;
    if (
      !Array.isArray(numbers) ||
      !numbers.length ||
      numbers.some(
        (value) => !Number.isInteger(value) || value < 0 || value > 2147483647,
      ) ||
      new Set(numbers).size !== numbers.length
    ) {
      throw new BadRequestException(
        'line_numbers must contain distinct non-negative integers',
      );
    }
    const source = (await this.source(recordId)).filter(
      (line) =>
        line.ItemType === 'pit_Item' &&
        line.LineNumber != null &&
        numbers.includes(Number(line.LineNumber)),
    );
    if (
      source.length !== numbers.length ||
      numbers.some(
        (number) => !source.some((line) => Number(line.LineNumber) === number),
      )
    ) {
      throw new BadRequestException(
        'Selected materials do not belong to this production order',
      );
    }
    return this.lines.importLines(
      recordId,
      source.map((line) => this.toRow(line)),
    );
  }

  private toRow(line: ProductionOrderLineWithRelations) {
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
      source_stage_id: line.StageID ?? null,
      stage_name:
        line.ProductionOrdersStage?.Name == null
          ? line.StageID == null
            ? null
            : String(line.StageID)
          : String(line.ProductionOrdersStage.Name),
      item_code: String(line.ItemNo ?? ''),
      item_name: String(line.ItemName ?? ''),
      lot_no: line.U_SL == null ? null : String(line.U_SL),
      planned_quantity: quantity.toFixed(),
      unit: String(line.UnitOfMeasurement?.Code ?? line.UoMCode ?? ''),
      note: null,
    };
  }
}
