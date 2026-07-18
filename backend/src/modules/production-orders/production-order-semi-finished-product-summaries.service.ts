import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSemiFinishedProductSummaryDto } from './dto/create-production-order-semi-finished-product-summary.dto';
import { UpdateProductionOrderSemiFinishedProductSummaryDto } from './dto/update-production-order-semi-finished-product-summary.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const QUANTITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const QUANTITY_INTEGER_DIGITS = 9;
const MAX_STAGE_LENGTH = 100;
const DEFAULT_SUMMARY_UNIT = 'kg';
const MAX_UNIT_LENGTH = 20;

const QUANTITY_FIELDS = [
  'input_quantity',
  'packed_quantity',
  'leftover_quantity',
  'waste_quantity',
] as const;

const UNIT_FIELDS = [
  'input_unit',
  'packed_unit',
  'leftover_unit',
  'waste_unit',
] as const;

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const semiFinishedProductSummaryInclude = {
  createdBy: {
    select: creatorSelect,
  },
} satisfies Prisma.ProductionOrderSemiFinishedProductSummariesInclude;

@Injectable()
export class ProductionOrderSemiFinishedProductSummariesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderSemiFinishedProductSummaries.findUnique(
        {
          where: { id: summaryId },
          include: semiFinishedProductSummaryInclude,
        },
      );

    if (!summary) {
      throw new NotFoundException('Semi-finished product summary not found');
    }

    return summary;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductSummaries.findMany(
      {
        where: { production_order_id: productionOrderId },
        include: semiFinishedProductSummaryInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSemiFinishedProductSummaryDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductSummaries.create(
      {
        data: {
          production_order_id: productionOrderId,
          ...this.normalizeCreateData(dto),
          created_by_id: this.normalizeUserId(user),
        },
        include: semiFinishedProductSummaryInclude,
      },
    );
  }

  async update(
    summaryId: number,
    dto: UpdateProductionOrderSemiFinishedProductSummaryDto,
  ) {
    await this.ensureSummaryExists(summaryId);

    return this.prismaService.productionOrderSemiFinishedProductSummaries.update(
      {
        where: { id: summaryId },
        data: this.normalizeUpdateData(dto),
        include: semiFinishedProductSummaryInclude,
      },
    );
  }

  async delete(summaryId: number) {
    await this.ensureSummaryExists(summaryId);

    return this.prismaService.productionOrderSemiFinishedProductSummaries.delete(
      {
        where: { id: summaryId },
        include: semiFinishedProductSummaryInclude,
      },
    );
  }

  private normalizeCreateData(
    dto: CreateProductionOrderSemiFinishedProductSummaryDto,
  ) {
    return {
      stage: this.normalizeOptionalText(dto?.stage, 'stage', MAX_STAGE_LENGTH),
      input_quantity: this.normalizeOptionalQuantity(
        dto?.input_quantity,
        'input_quantity',
      ),
      input_unit: this.normalizeCreateUnit(dto?.input_unit, 'input_unit'),
      packed_quantity: this.normalizeOptionalQuantity(
        dto?.packed_quantity,
        'packed_quantity',
      ),
      packed_unit: this.normalizeCreateUnit(dto?.packed_unit, 'packed_unit'),
      leftover_quantity: this.normalizeOptionalQuantity(
        dto?.leftover_quantity,
        'leftover_quantity',
      ),
      leftover_unit: this.normalizeCreateUnit(
        dto?.leftover_unit,
        'leftover_unit',
      ),
      waste_quantity: this.normalizeOptionalQuantity(
        dto?.waste_quantity,
        'waste_quantity',
      ),
      waste_unit: this.normalizeCreateUnit(dto?.waste_unit, 'waste_unit'),
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSemiFinishedProductSummaryDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSemiFinishedProductSummariesUpdateInput =
      {};

    if ('stage' in updateDto) {
      data.stage = this.normalizeOptionalText(
        updateDto.stage,
        'stage',
        MAX_STAGE_LENGTH,
      );
    }

    for (const field of QUANTITY_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalQuantity(updateDto[field], field);
      }
    }

    for (const field of UNIT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeUnit(updateDto[field], field);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeOptionalText(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (this.isEmptyValue(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return text;
  }

  private normalizeOptionalQuantity(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!QUANTITY_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > QUANTITY_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }

    return new Prisma.Decimal(normalizedValue);
  }

  private normalizeCreateUnit(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) {
      return DEFAULT_SUMMARY_UNIT;
    }

    return this.normalizeUnit(value, fieldName);
  }

  private normalizeUnit(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const unit = value.trim();

    if (unit.length > MAX_UNIT_LENGTH) {
      throw new BadRequestException(
        `${fieldName} must be at most ${MAX_UNIT_LENGTH} characters`,
      );
    }

    return unit;
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

  private async ensureSummaryExists(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderSemiFinishedProductSummaries.findUnique(
        {
          where: { id: summaryId },
          select: { id: true },
        },
      );

    if (!summary) {
      throw new NotFoundException('Semi-finished product summary not found');
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
