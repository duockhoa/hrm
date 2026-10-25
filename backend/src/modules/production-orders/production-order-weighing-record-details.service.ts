import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderWeighingRecordDetailDto } from './dto/create-production-order-weighing-record-detail.dto';
import { UpdateProductionOrderWeighingRecordDetailDto } from './dto/update-production-order-weighing-record-detail.dto';
import {
  getProductionOrderWeighingRecordDetailImagePath,
  PRODUCTION_ORDER_WEIGHING_RECORD_DETAIL_IMAGE_ROUTE,
  removeProductionOrderWeighingRecordDetailImageByPath,
  resolveProductionOrderWeighingRecordDetailImageFile,
} from './production-order-weighing-record-detail-upload.config';

type User = { id?: number | string | null };
const include = {
  images: { orderBy: { id: 'asc' } },
  weighedBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.ProductionOrderWeighingRecordDetailsInclude;

@Injectable()
export class ProductionOrderWeighingRecordDetailsService {
  private readonly logger = new Logger(
    ProductionOrderWeighingRecordDetailsService.name,
  );
  constructor(private readonly prisma: PrismaService) {}

  async findAll(recordId: number, lineId: number) {
    await this.context(this.prisma, recordId, lineId);
    return this.prisma.productionOrderWeighingRecordDetails.findMany({
      where: { production_order_weighing_record_line_id: lineId },
      include,
      orderBy: { id: 'asc' },
    });
  }

  async findById(recordId: number, lineId: number, id: number) {
    await this.context(this.prisma, recordId, lineId);
    return this.detail(this.prisma, lineId, id);
  }

  async create(
    recordId: number,
    lineId: number,
    dto: CreateProductionOrderWeighingRecordDetailDto,
    user?: User,
    file?: Express.Multer.File | Express.Multer.File[],
  ) {
    const files = file ? (Array.isArray(file) ? file : [file]) : [];
    const paths = files.map((entry) =>
      getProductionOrderWeighingRecordDetailImagePath(entry)!,
    );
    const userId = this.userId(user);
    const data = this.data(dto, true);
    return this.write(recordId, lineId, (tx, line) =>
      tx.productionOrderWeighingRecordDetails.create({
        data: {
          production_order_weighing_record_line_id: lineId,
          net_weight: data.net_weight!,
          unit: line.unit,
          note: data.note,
          image_path: paths[0],
          ...(paths.length
            ? {
                images: { create: paths.map((image_path) => ({ image_path })) },
              }
            : {}),
          weighed_by_id: userId,
          weighed_at: new Date(),
        },
        include,
      }),
    );
  }

  async update(
    recordId: number,
    lineId: number,
    id: number,
    dto: UpdateProductionOrderWeighingRecordDetailDto,
    user?: User,
  ) {
    const userId = this.userId(user);
    const data = this.data(dto, false);
    return this.write(recordId, lineId, async (tx) => {
      await this.detail(tx, lineId, id);
      return tx.productionOrderWeighingRecordDetails.update({
        where: { id, production_order_weighing_record_line_id: lineId },
        data: {
          ...data,
          ...(data.net_weight
            ? { weighed_by_id: userId, weighed_at: new Date() }
            : {}),
        },
        include,
      });
    });
  }

  async delete(recordId: number, lineId: number, id: number) {
    const result = await this.write(recordId, lineId, async (tx) => {
      await this.detail(tx, lineId, id);
      return tx.productionOrderWeighingRecordDetails.delete({
        where: { id, production_order_weighing_record_line_id: lineId },
        include,
      });
    });
    await this.removeImages(result);
    return result;
  }

  async uploadImage(
    recordId: number,
    lineId: number,
    id: number,
    file: Express.Multer.File,
  ) {
    const imagePath = getProductionOrderWeighingRecordDetailImagePath(file);
    if (!imagePath) throw new BadRequestException('image is required');
    const { updated, oldPath } = await this.write(
      recordId,
      lineId,
      async (tx) => {
        const current = await this.detail(tx, lineId, id);
        const updated = await tx.productionOrderWeighingRecordDetails.update({
          where: { id, production_order_weighing_record_line_id: lineId },
          data: {
            image_path: imagePath,
            images: { deleteMany: {}, create: { image_path: imagePath } },
          },
          include,
        });
        return { updated, oldPath: current };
      },
    );
    await this.removeImages(oldPath);
    return updated;
  }

  async deleteImage(recordId: number, lineId: number, id: number) {
    const { updated, oldPath } = await this.write(
      recordId,
      lineId,
      async (tx) => {
        const current = await this.detail(tx, lineId, id);
        const updated = await tx.productionOrderWeighingRecordDetails.update({
          where: { id, production_order_weighing_record_line_id: lineId },
          data: { image_path: null, images: { deleteMany: {} } },
          include,
        });
        return { updated, oldPath: current };
      },
    );
    await this.removeImages(oldPath);
    return updated;
  }

  async uploadImages(
    recordId: number,
    lineId: number,
    id: number,
    files: Express.Multer.File[],
  ) {
    if (!files.length) throw new BadRequestException('images are required');
    const paths = files.map((file) =>
      getProductionOrderWeighingRecordDetailImagePath(file)!,
    );
    return this.write(recordId, lineId, async (tx) => {
      const current = await this.detail(tx, lineId, id);
      return tx.productionOrderWeighingRecordDetails.update({
        where: { id, production_order_weighing_record_line_id: lineId },
        data: {
          image_path: current.image_path ?? paths[0],
          images: { create: paths.map((image_path) => ({ image_path })) },
        },
        include,
      });
    });
  }

  async deleteImageById(
    recordId: number,
    lineId: number,
    id: number,
    imageId: number,
  ) {
    const { updated, path } = await this.write(recordId, lineId, async (tx) => {
      const current = await this.detail(tx, lineId, id);
      const image = current.images.find((entry) => entry.id === imageId);
      if (!image)
        throw new NotFoundException('Weighing detail image not found');
      const remaining = current.images.filter((entry) => entry.id !== imageId);
      const updated = await tx.productionOrderWeighingRecordDetails.update({
        where: { id, production_order_weighing_record_line_id: lineId },
        data: {
          image_path: remaining[0]?.image_path ?? null,
          images: { delete: { id: imageId } },
        },
        include,
      });
      return { updated, path: image.image_path };
    });
    await this.removeImage(path);
    return updated;
  }

  private async removeImages(detail: {
    image_path: string | null;
    images?: { image_path: string }[];
  }) {
    const paths = new Set([
      detail.image_path,
      ...(detail.images ?? []).map((image) => image.image_path),
    ]);
    await Promise.all(
      [...paths]
        .filter((path): path is string => Boolean(path))
        .map((path) => this.removeImage(path)),
    );
  }

  async findImage(filename: string, original = false) {
    const detail =
      await this.prisma.productionOrderWeighingRecordDetails.findFirst({
        where: {
          OR: [
            {
              image_path: `${PRODUCTION_ORDER_WEIGHING_RECORD_DETAIL_IMAGE_ROUTE}/${filename}`,
            },
            {
              images: {
                some: {
                  image_path: `${PRODUCTION_ORDER_WEIGHING_RECORD_DETAIL_IMAGE_ROUTE}/${filename}`,
                },
              },
            },
          ],
        },
        select: { id: true },
      });
    // The Prisma scope extension follows detail -> line -> record -> order,
    // including on image lookup. A filename alone must never grant access.
    if (!detail) throw new NotFoundException('Weighing detail image not found');
    const image = await resolveProductionOrderWeighingRecordDetailImageFile(
      filename,
      original,
    );
    if (!image) throw new NotFoundException('Weighing detail image not found');
    return image;
  }

  private async removeImage(path: string | null) {
    try {
      await removeProductionOrderWeighingRecordDetailImageByPath(path);
    } catch {
      this.logger.warn('Could not remove an obsolete weighing detail image');
    }
  }

  private async context(
    tx: Prisma.TransactionClient,
    recordId: number,
    lineId: number,
  ) {
    const record = await tx.productionOrderWeighingRecords.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        status: true,
        qa_staff_approved_at: true,
        ipc_staff_approved_at: true,
      },
    });
    if (!record)
      throw new NotFoundException('Production order weighing record not found');
    const line = await tx.productionOrderWeighingRecordLines.findUnique({
      where: { id: lineId, production_order_weighing_record_id: recordId },
      select: { id: true, unit: true },
    });
    if (!line) throw new NotFoundException('Weighing record line not found');
    return { record, line };
  }

  private async detail(
    tx: Prisma.TransactionClient,
    lineId: number,
    id: number,
  ) {
    const detail = await tx.productionOrderWeighingRecordDetails.findUnique({
      where: { id, production_order_weighing_record_line_id: lineId },
      include,
    });
    if (!detail)
      throw new NotFoundException('Weighing record detail not found');
    return detail;
  }

  private async write<T>(
    recordId: number,
    lineId: number,
    action: (
      tx: Prisma.TransactionClient,
      line: { id: number; unit: string },
    ) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const { record } = await this.context(tx, recordId, lineId);
          if (
            record.status === 'approved' ||
            record.qa_staff_approved_at ||
            record.ipc_staff_approved_at
          )
            throw new ConflictException(
              'Approved weighing records cannot be edited',
            );
          await tx.productionOrderWeighingRecords.update({
            where: {
              id: recordId,
              status: record.status,
              qa_staff_approved_at: null,
              ipc_staff_approved_at: null,
            },
            data: { updated_at: new Date() },
            select: { id: true },
          });
          // Re-read after acquiring the parent lock; a material edit may have
          // committed while this request was waiting for the lock.
          const { line } = await this.context(tx, recordId, lineId);
          return action(tx, line);
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
            'Referenced material line or user no longer exists',
          );
      }
      throw error;
    }
  }

  private userId(user?: User) {
    const id = Number(user?.id);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new UnauthorizedException('Authenticated user not found');
    return id;
  }

  private data(dto: unknown, creating: boolean) {
    if (
      !dto ||
      typeof dto !== 'object' ||
      Array.isArray(dto) ||
      Object.keys(dto).some((key) => !['net_weight', 'note'].includes(key))
    )
      throw new BadRequestException('Only net_weight and note are allowed');
    const input = dto as Record<string, unknown>;
    if (creating && input.net_weight === undefined)
      throw new BadRequestException('net_weight is required');
    const data: { net_weight?: Prisma.Decimal; note?: string | null } = {};
    if (input.net_weight !== undefined) {
      const value = input.net_weight;
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !/^-?\d{1,12}(\.\d{1,6})?$/.test(String(value))
      )
        throw new BadRequestException(
          'net_weight must be a non-zero Decimal(18,6)',
        );
      const weight = new Prisma.Decimal(value);
      if (weight.isZero())
        throw new BadRequestException('net_weight must not be zero');
      data.net_weight = weight;
    }
    if (input.note !== undefined) {
      if (input.note !== null && typeof input.note !== 'string')
        throw new BadRequestException('note must be a string or null');
      const note = typeof input.note === 'string' ? input.note.trim() : null;
      if (note && Buffer.byteLength(note, 'utf8') > 65535)
        throw new BadRequestException('note is too long');
      data.note = note || null;
    }
    if (!Object.keys(data).length)
      throw new BadRequestException('No fields to update');
    return data;
  }
}
