import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderMaterialProcessSummaryDto } from './dto/create-production-order-material-process-summary.dto';
import { UpdateProductionOrderMaterialProcessSummaryDto } from './dto/update-production-order-material-process-summary.dto';
import {
  getMaterialProcessSummaryImageLookupPaths,
  removeMaterialProcessSummaryImageByPath,
  resolveMaterialProcessSummaryImageFile,
} from './production-order-material-process-summary-upload.config';

type AuthenticatedUser = { id?: number | string | null };

const QUANTITY_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const PERCENT_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const MAX_STAGE_LENGTH = 100;
const MAX_UNIT_LENGTH = 20;
const DEFAULT_UNIT = 'kg';

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const summaryInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.ProductionOrderMaterialProcessSummariesInclude;

const summaryValuesSelect = {
  id: true,
  image_path: true,
} satisfies Prisma.ProductionOrderMaterialProcessSummariesSelect;

@Injectable()
export class ProductionOrderMaterialProcessSummariesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderMaterialProcessSummaries.findUnique(
        { where: { id: summaryId }, include: summaryInclude },
      );
    if (!summary) {
      throw new NotFoundException('Material process summary not found');
    }
    return summary;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);
    return this.prismaService.productionOrderMaterialProcessSummaries.findMany({
      where: { production_order_id: productionOrderId },
      include: summaryInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findImageFile(filename: string, original = false) {
    const imagePaths = getMaterialProcessSummaryImageLookupPaths(filename);
    if (imagePaths.length === 0) return null;

    const summary =
      await this.prismaService.productionOrderMaterialProcessSummaries.findFirst(
        {
          where: { image_path: { in: imagePaths } },
          select: { id: true },
        },
      );
    return summary
      ? resolveMaterialProcessSummaryImageFile(filename, original)
      : null;
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderMaterialProcessSummaryDto,
    user?: AuthenticatedUser,
    files: { imagePath?: string } = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    return this.prismaService.productionOrderMaterialProcessSummaries.create({
      data: {
        production_order_id: productionOrderId,
        process_stage: this.normalizeRequiredText(
          dto?.process_stage,
          'process_stage',
          MAX_STAGE_LENGTH,
        ),
        yielded_quantity: this.normalizeRequiredQuantity(
          dto?.yielded_quantity,
          'yielded_quantity',
        ),
        yielded_unit: this.normalizeCreateUnit(dto?.yielded_unit),
        moisture_percent: this.normalizeOptionalPercentage(
          dto?.moisture_percent,
        ),
        image_path: files.imagePath ?? null,
        note: this.normalizeOptionalText(dto?.note, 'note'),
        created_by_id: this.normalizeUserId(user),
      },
      include: summaryInclude,
    });
  }

  async update(
    summaryId: number,
    dto: UpdateProductionOrderMaterialProcessSummaryDto,
    files: { imagePath?: string } = {},
  ) {
    const existingSummary = await this.findValuesByIdOrThrow(summaryId);
    const data = this.normalizeUpdateData(dto, files);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    const updatedSummary =
      await this.prismaService.productionOrderMaterialProcessSummaries.update({
        where: { id: summaryId },
        data,
        include: summaryInclude,
      });

    if (files.imagePath && existingSummary.image_path !== files.imagePath) {
      await removeMaterialProcessSummaryImageByPath(existingSummary.image_path);
    }
    return updatedSummary;
  }

  async delete(summaryId: number) {
    const existingSummary = await this.findValuesByIdOrThrow(summaryId);
    const deletedSummary =
      await this.prismaService.productionOrderMaterialProcessSummaries.delete({
        where: { id: summaryId },
        include: summaryInclude,
      });
    await removeMaterialProcessSummaryImageByPath(existingSummary.image_path);
    return deletedSummary;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderMaterialProcessSummaryDto,
    files: { imagePath?: string },
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderMaterialProcessSummariesUpdateInput = {};
    if ('process_stage' in updateDto) {
      data.process_stage = this.normalizeRequiredText(
        updateDto.process_stage,
        'process_stage',
        MAX_STAGE_LENGTH,
      );
    }
    if ('yielded_quantity' in updateDto) {
      data.yielded_quantity = this.normalizeRequiredQuantity(
        updateDto.yielded_quantity,
        'yielded_quantity',
      );
    }
    if ('yielded_unit' in updateDto) {
      data.yielded_unit = this.normalizeRequiredText(
        updateDto.yielded_unit,
        'yielded_unit',
        MAX_UNIT_LENGTH,
      );
    }
    if ('moisture_percent' in updateDto) {
      data.moisture_percent = this.normalizeOptionalPercentage(
        updateDto.moisture_percent,
      );
    }
    if ('note' in updateDto) {
      data.note = this.normalizeOptionalText(updateDto.note, 'note');
    }
    if (files.imagePath) data.image_path = files.imagePath;
    return data;
  }

  private normalizeRequiredText(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }
    const normalizedValue = value.trim();
    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }
    return normalizedValue;
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    return value.trim();
  }

  private normalizeRequiredQuantity(value: unknown, fieldName: string) {
    const normalizedValue = this.normalizeDecimalValue(value);
    if (!QUANTITY_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }
    const [integerPart] = normalizedValue.split('.');
    if (integerPart.length > 9) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }
    return new Prisma.Decimal(normalizedValue);
  }

  private normalizeOptionalPercentage(value: unknown) {
    if (this.isEmptyValue(value)) return null;
    const normalizedValue = this.normalizeDecimalValue(value);
    if (!PERCENT_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        'moisture_percent must have up to 2 decimal places',
      );
    }
    const percentage = new Prisma.Decimal(normalizedValue);
    if (percentage.greaterThan(100)) {
      throw new BadRequestException('moisture_percent must not exceed 100');
    }
    return percentage;
  }

  private normalizeDecimalValue(value: unknown) {
    return typeof value === 'number'
      ? String(value)
      : typeof value === 'string'
        ? value.trim().replace(',', '.')
        : '';
  }

  private normalizeCreateUnit(value: unknown) {
    return this.isEmptyValue(value)
      ? DEFAULT_UNIT
      : this.normalizeRequiredText(value, 'yielded_unit', MAX_UNIT_LENGTH);
  }

  private isEmptyValue(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });
    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async findValuesByIdOrThrow(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderMaterialProcessSummaries.findUnique(
        { where: { id: summaryId }, select: summaryValuesSelect },
      );
    if (!summary) {
      throw new NotFoundException('Material process summary not found');
    }
    return summary;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return userId;
  }
}
