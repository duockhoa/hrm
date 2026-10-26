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
import { CheckWeighingRecordLotDto } from './dto/check-weighing-record-lot.dto';
import {
  getProductionOrderWeighingRecordLotCheckImagePath,
  PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE,
  removeProductionOrderWeighingRecordLotCheckImageByPath,
  resolveProductionOrderWeighingRecordLotCheckImageFile,
} from './production-order-weighing-record-lot-check-upload.config';

const lotCheckInclude = {
  images: { orderBy: { id: 'asc' } },
} satisfies Prisma.ProductionOrderWeighingRecordLineChecksInclude;

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
        lotCheck: { include: lotCheckInclude },
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
    const obsoleteImages: string[] = [];
    const updated = await this.write(recordId, async (tx) => {
      const current = await this.line(tx, recordId, lineId);
      await tx.productionOrderWeighingRecordLines.update({
        where: { id: lineId, production_order_weighing_record_id: recordId },
        data,
      });
      if (
        (data.lot_no !== undefined && data.lot_no !== current.lot_no) ||
        (data.item_code !== undefined && data.item_code !== current.item_code)
      ) {
        const check =
          await tx.productionOrderWeighingRecordLineChecks.findUnique({
            where: { production_order_weighing_record_line_id: lineId },
            include: lotCheckInclude,
          });
        obsoleteImages.push(
          ...(check?.images ?? []).map((image) => image.image_path),
        );
        await tx.productionOrderWeighingRecordLineChecks.deleteMany({
          where: { production_order_weighing_record_line_id: lineId },
        });
      }
      return tx.productionOrderWeighingRecordLines.findUniqueOrThrow({
        where: { id: lineId, production_order_weighing_record_id: recordId },
        include: { lotCheck: { include: lotCheckInclude } },
      });
    });
    await this.removeLotCheckImages(obsoleteImages);
    return updated;
  }

  async checkLot(
    recordId: number,
    lineId: number,
    dto: CheckWeighingRecordLotDto,
    user: { id?: number | string | null },
    files: Express.Multer.File[] = [],
  ) {
    if (files.length > 20)
      throw new BadRequestException('Mỗi lần tải lên tối đa 20 ảnh.');
    const images = files.map((file) => ({
      image_path: getProductionOrderWeighingRecordLotCheckImagePath(file)!,
    }));
    const userId = Number(user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw new BadRequestException('Invalid checking user');
    if (
      typeof dto?.is_correct !== 'boolean' ||
      typeof dto?.lot_no !== 'string' ||
      !dto.lot_no.trim()
    )
      throw new BadRequestException('is_correct and lot_no are required');
    return this.prisma.$transaction(async (tx) => {
      await this.parent(tx, recordId);
      await this.line(tx, recordId, lineId);
      // Lock the material row and reject a form opened for an older lot number.
      const locked = await tx.productionOrderWeighingRecordLines.updateMany({
        where: {
          id: lineId,
          production_order_weighing_record_id: recordId,
          lot_no: dto.lot_no,
        },
        data: { updated_at: new Date() },
      });
      if (locked.count !== 1)
        throw new ConflictException(
          'Số lô đã thay đổi. Vui lòng tải lại và kiểm tra lại.',
        );
      const data = {
        is_correct: dto.is_correct,
        checked_by_id: userId,
        checked_at: new Date(),
      };
      return tx.productionOrderWeighingRecordLineChecks.upsert({
        where: { production_order_weighing_record_line_id: lineId },
        create: {
          ...data,
          production_order_weighing_record_line_id: lineId,
          ...(images.length ? { images: { create: images } } : {}),
        },
        update: {
          ...data,
          ...(images.length ? { images: { create: images } } : {}),
        },
        include: lotCheckInclude,
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
    const deleted = await this.write(recordId, async (tx) => {
      await this.line(tx, recordId, lineId);
      return tx.productionOrderWeighingRecordLines.delete({
        where: { id: lineId, production_order_weighing_record_id: recordId },
        include: { lotCheck: { include: lotCheckInclude } },
      });
    });
    await this.removeLotCheckImages(
      (deleted.lotCheck?.images ?? []).map((image) => image.image_path),
    );
    return deleted;
  }

  async deleteLotCheckImage(recordId: number, lineId: number, imageId: number) {
    const { updated, path } = await this.prisma.$transaction(async (tx) => {
      await this.parent(tx, recordId);
      await this.line(tx, recordId, lineId);
      await tx.productionOrderWeighingRecordLines.update({
        where: { id: lineId, production_order_weighing_record_id: recordId },
        data: { updated_at: new Date() },
      });
      const image =
        await tx.productionOrderWeighingRecordLineCheckImages.findFirst({
          where: {
            id: imageId,
            lotCheck: { production_order_weighing_record_line_id: lineId },
          },
        });
      if (!image) throw new NotFoundException('Lot check image not found');
      await tx.productionOrderWeighingRecordLineCheckImages.delete({
        where: { id: imageId },
      });
      const updated =
        await tx.productionOrderWeighingRecordLineChecks.findUniqueOrThrow({
          where: { production_order_weighing_record_line_id: lineId },
          include: lotCheckInclude,
        });
      return { updated, path: image.image_path };
    });
    await this.removeLotCheckImages([path]);
    return updated;
  }

  async findLotCheckImage(filename: string, original = false) {
    const image =
      await this.prisma.productionOrderWeighingRecordLineCheckImages.findFirst({
        where: {
          image_path: `${PRODUCTION_ORDER_WEIGHING_RECORD_LOT_CHECK_IMAGE_ROUTE}/${filename}`,
        },
        select: { id: true },
      });
    // Scope extension follows image -> lot check -> line -> record -> order.
    if (!image) throw new NotFoundException('Lot check image not found');
    const file = await resolveProductionOrderWeighingRecordLotCheckImageFile(
      filename,
      original,
    );
    if (!file) throw new NotFoundException('Lot check image not found');
    return file;
  }

  private async removeLotCheckImages(paths: string[]) {
    await Promise.all(
      paths.map((path) =>
        removeProductionOrderWeighingRecordLotCheckImageByPath(path).catch(
          () => undefined,
        ),
      ),
    );
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
      include: { lotCheck: { include: lotCheckInclude } },
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
      data[key] = value;
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
