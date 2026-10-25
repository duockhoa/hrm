import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderWeighingRecordLineDto } from './dto/create-production-order-weighing-record-line.dto';
import { UpdateProductionOrderWeighingRecordLineDto } from './dto/update-production-order-weighing-record-line.dto';

const fields = [
  'source_line_number',
  'source_stage_id',
  'stage_name',
  'item_code',
  'item_name',
  'lot_no',
  'planned_quantity',
  'unit',
  'note',
];
type LineData = Omit<
  Prisma.ProductionOrderWeighingRecordLinesUncheckedCreateInput,
  'production_order_weighing_record_id' | 'id' | 'created_at' | 'updated_at'
>;

@Injectable()
export class ProductionOrderWeighingRecordLinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(recordId: number) {
    await this.parent(this.prisma, recordId);
    return this.prisma.productionOrderWeighingRecordLines.findMany({
      where: { production_order_weighing_record_id: recordId },
      orderBy: [{ item_code: 'asc' }, { id: 'asc' }],
      include: {
        details: {
          orderBy: { id: 'asc' },
          include: {
            images: { orderBy: { id: 'asc' } },
            weighedBy: { select: { id: true, username: true, name: true } },
          },
        },
      },
    });
  }

  async findById(recordId: number, lineId: number) {
    await this.parent(this.prisma, recordId);
    return this.line(this.prisma, recordId, lineId);
  }

  async create(
    recordId: number,
    dto: CreateProductionOrderWeighingRecordLineDto,
  ) {
    const data = this.buildData(dto, true) as LineData;
    return this.write(recordId, (tx) =>
      tx.productionOrderWeighingRecordLines.create({
        data: { ...data, production_order_weighing_record_id: recordId },
      }),
    );
  }

  async update(
    recordId: number,
    lineId: number,
    dto: UpdateProductionOrderWeighingRecordLineDto,
  ) {
    const data = this.buildData(dto, false);
    return this.write(recordId, async (tx) => {
      await this.line(tx, recordId, lineId);
      return tx.productionOrderWeighingRecordLines.update({
        where: { id: lineId, production_order_weighing_record_id: recordId },
        data,
      });
    });
  }

  async importStage(
    recordId: number,
    stageId: number,
    rows: CreateProductionOrderWeighingRecordLineDto[],
  ) {
    if (!rows.length)
      throw new BadRequestException('Selected stage has no material lines');
    const data = rows.map((row) => this.buildData(row, true) as LineData);
    return this.write(recordId, async (tx) => {
      const existing = await tx.productionOrderWeighingRecordLines.findFirst({
        where: {
          production_order_weighing_record_id: recordId,
          source_stage_id: stageId,
        },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException(
          'This stage has already been imported into the weighing record',
        );
      const imported: Prisma.ProductionOrderWeighingRecordLinesGetPayload<object>[] =
        [];
      for (const row of data) {
        imported.push(
          await tx.productionOrderWeighingRecordLines.create({
            data: {
              ...row,
              source_stage_id: stageId,
              production_order_weighing_record_id: recordId,
            },
          }),
        );
      }
      return imported;
    });
  }

  async importLines(
    recordId: number,
    rows: CreateProductionOrderWeighingRecordLineDto[],
  ) {
    if (!rows.length)
      throw new BadRequestException('Select at least one material');
    const data = rows.map((row) => this.buildData(row, true) as LineData);
    return this.write(recordId, async (tx) => {
      const existing = await tx.productionOrderWeighingRecordLines.findFirst({
        where: {
          production_order_weighing_record_id: recordId,
          source_line_number: {
            in: rows.map((row) => row.source_line_number!),
          },
        },
        select: { id: true },
      });
      if (existing)
        throw new ConflictException(
          'Selected materials have already been added to the weighing record',
        );
      const imported: Prisma.ProductionOrderWeighingRecordLinesGetPayload<object>[] =
        [];
      for (const row of data) {
        imported.push(
          await tx.productionOrderWeighingRecordLines.create({
            data: { ...row, production_order_weighing_record_id: recordId },
          }),
        );
      }
      return imported;
    });
  }

  async delete(recordId: number, lineId: number) {
    return this.write(recordId, async (tx) => {
      await this.line(tx, recordId, lineId);
      return tx.productionOrderWeighingRecordLines.delete({
        where: { id: lineId, production_order_weighing_record_id: recordId },
      });
    });
  }

  private async parent(tx: Prisma.TransactionClient, id: number) {
    const record = await tx.productionOrderWeighingRecords.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        qa_staff_approved_at: true,
        ipc_staff_approved_at: true,
      },
    });
    if (!record)
      throw new NotFoundException('Production order weighing record not found');
    return record;
  }

  private async line(
    tx: Prisma.TransactionClient,
    recordId: number,
    id: number,
  ) {
    const line = await tx.productionOrderWeighingRecordLines.findUnique({
      where: { id, production_order_weighing_record_id: recordId },
    });
    if (!line) throw new NotFoundException('Weighing record line not found');
    return line;
  }

  private async write<T>(
    recordId: number,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const record = await this.parent(tx, recordId);
          if (record.ipc_staff_approved_at) {
            throw new ConflictException(
              'IPC đã ký duyệt, không thể sửa nguyên liệu của phiếu cân.',
            );
          }
          if (record.status === 'approved') {
            throw new ConflictException(
              'Approved weighing records cannot be edited',
            );
          }
          // Lock the parent before editing children. Approval writes use the same row,
          // so a concurrent signature cannot commit before an unchecked child edit.
          await tx.productionOrderWeighingRecords.update({
            where: {
              id: recordId,
              status: record.status,
              qa_staff_approved_at: record.qa_staff_approved_at,
              ipc_staff_approved_at: null,
            },
            data: { updated_at: new Date() },
            select: { id: true },
          });
          return action(tx);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 30000,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025' || error.code === 'P2034')
          throw new ConflictException(
            'Weighing record changed; reload and try again',
          );
        if (error.code === 'P2003')
          throw new BadRequestException(
            'Referenced weighing record no longer exists',
          );
      }
      throw error;
    }
  }

  private buildData(dto: unknown, creating: boolean): Partial<LineData> {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto))
      throw new BadRequestException('Request body must be an object');
    const input = dto as Record<string, unknown>;
    if (Object.keys(input).some((key) => !fields.includes(key)))
      throw new BadRequestException(
        `Only these fields are allowed: ${fields.join(', ')}`,
      );
    if (
      creating &&
      ['item_code', 'item_name', 'planned_quantity', 'unit'].some(
        (key) => input[key] === undefined,
      )
    )
      throw new BadRequestException(
        'item_code, item_name, planned_quantity and unit are required',
      );
    const data: Partial<LineData> = {};
    for (const key of ['item_code', 'item_name', 'unit'] as const) {
      if (input[key] === undefined) continue;
      data[key] = this.text(input[key], key, key === 'unit' ? 50 : 255, false)!;
    }
    for (const key of ['stage_name', 'lot_no', 'note'] as const) {
      if (input[key] === undefined) continue;
      data[key] = this.text(
        input[key],
        key,
        key === 'note' ? 65535 : 255,
        true,
      );
    }
    for (const key of ['source_line_number', 'source_stage_id'] as const) {
      const value = input[key];
      if (value === undefined) continue;
      if (
        value !== null &&
        (typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > 2147483647)
      )
        throw new BadRequestException(
          `${key} must be a non-negative integer or null`,
        );
      data[key] = value as number | null;
    }
    if (input.planned_quantity !== undefined) {
      const value = input.planned_quantity;
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !/^\d{1,12}(\.\d{1,6})?$/.test(String(value))
      )
        throw new BadRequestException(
          'planned_quantity must be a positive Decimal(18,6)',
        );
      const quantity = new Prisma.Decimal(value);
      if (!quantity.greaterThan(0))
        throw new BadRequestException(
          'planned_quantity must be greater than zero',
        );
      data.planned_quantity = quantity;
    }
    if (!Object.keys(data).length)
      throw new BadRequestException('No fields to update');
    return data;
  }

  private text(value: unknown, field: string, max: number, nullable: boolean) {
    if (value === null && nullable) return null;
    if (typeof value !== 'string')
      throw new BadRequestException(
        `${field} must be a string${nullable ? ' or null' : ''}`,
      );
    const text = value.trim();
    const length =
      field === 'note'
        ? Buffer.byteLength(text, 'utf8')
        : Array.from(text).length;
    if (length > max || (!nullable && !text))
      throw new BadRequestException(
        `${field} must ${nullable ? '' : 'be non-empty and '}contain at most ${max} characters`,
      );
    return nullable ? text || null : text;
  }
}
