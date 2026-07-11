import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSemiFinishedGrossWeightCheckDto } from './dto/create-production-order-semi-finished-gross-weight-check.dto';
import { UpdateProductionOrderSemiFinishedGrossWeightCheckDto } from './dto/update-production-order-semi-finished-gross-weight-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const GROSS_WEIGHT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const GROSS_WEIGHT_INTEGER_DIGITS = 7;
const WEIGHT_UNIT = 'g';
const REQUIRED_GROSS_WEIGHT_FIELDS = ['unit_1_gross_weight'] as const;
const OPTIONAL_GROSS_WEIGHT_FIELDS = [
  'unit_2_gross_weight',
  'unit_3_gross_weight',
  'unit_4_gross_weight',
  'unit_5_gross_weight',
  'unit_6_gross_weight',
] as const;

type CreateGrossWeightData = {
  unit_1_gross_weight: Prisma.Decimal;
  unit_2_gross_weight: Prisma.Decimal | null;
  unit_3_gross_weight: Prisma.Decimal | null;
  unit_4_gross_weight: Prisma.Decimal | null;
  unit_5_gross_weight: Prisma.Decimal | null;
  unit_6_gross_weight: Prisma.Decimal | null;
};

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const grossWeightCheckInclude = {
  createdBy: {
    select: creatorSelect,
  },
} satisfies Prisma.ProductionOrderSemiFinishedProductGrossWeightChecksInclude;

@Injectable()
export class ProductionOrderSemiFinishedGrossWeightChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique(
        {
          where: { id: checkId },
          include: grossWeightCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Semi-finished product gross weight check not found',
      );
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findMany(
      {
        where: { production_order_id: productionOrderId },
        include: grossWeightCheckInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSemiFinishedGrossWeightCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.create(
      {
        data: {
          production_order_id: productionOrderId,
          requirement: this.normalizeOptionalRequirement(dto?.requirement),
          ...this.normalizeCreateWeights(dto),
          unit: WEIGHT_UNIT,
          created_by_id: this.normalizeUserId(user),
        },
        include: grossWeightCheckInclude,
      },
    );
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderSemiFinishedGrossWeightCheckDto,
  ) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.update(
      {
        where: { id: checkId },
        data: this.normalizeUpdateData(dto),
        include: grossWeightCheckInclude,
      },
    );
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.delete(
      {
        where: { id: checkId },
        include: grossWeightCheckInclude,
      },
    );
  }

  private normalizeCreateWeights(
    dto: CreateProductionOrderSemiFinishedGrossWeightCheckDto,
  ): CreateGrossWeightData {
    return {
      unit_1_gross_weight: this.normalizeRequiredGrossWeight(
        dto?.unit_1_gross_weight,
        'unit_1_gross_weight',
      ),
      unit_2_gross_weight: this.normalizeOptionalGrossWeight(
        dto?.unit_2_gross_weight,
        'unit_2_gross_weight',
      ),
      unit_3_gross_weight: this.normalizeOptionalGrossWeight(
        dto?.unit_3_gross_weight,
        'unit_3_gross_weight',
      ),
      unit_4_gross_weight: this.normalizeOptionalGrossWeight(
        dto?.unit_4_gross_weight,
        'unit_4_gross_weight',
      ),
      unit_5_gross_weight: this.normalizeOptionalGrossWeight(
        dto?.unit_5_gross_weight,
        'unit_5_gross_weight',
      ),
      unit_6_gross_weight: this.normalizeOptionalGrossWeight(
        dto?.unit_6_gross_weight,
        'unit_6_gross_weight',
      ),
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSemiFinishedGrossWeightCheckDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSemiFinishedProductGrossWeightChecksUpdateInput =
      {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeOptionalRequirement(
        updateDto.requirement,
      );
    }

    for (const field of REQUIRED_GROSS_WEIGHT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredGrossWeight(
          updateDto[field],
          field,
        );
      }
    }

    for (const field of OPTIONAL_GROSS_WEIGHT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalGrossWeight(
          updateDto[field],
          field,
        );
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeOptionalRequirement(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('requirement must be a string');
    }

    const requirement = value.trim();

    if (!requirement) {
      return null;
    }

    return requirement;
  }

  private normalizeRequiredGrossWeight(value: unknown, fieldName: string) {
    if (this.isEmptyGrossWeight(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeGrossWeightValue(value, fieldName);
  }

  private normalizeOptionalGrossWeight(value: unknown, fieldName: string) {
    if (this.isEmptyGrossWeight(value)) {
      return null;
    }

    return this.normalizeGrossWeightValue(value, fieldName);
  }

  private isEmptyGrossWeight(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private normalizeGrossWeightValue(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!GROSS_WEIGHT_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > GROSS_WEIGHT_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(10, 3)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
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

  private async ensureCheckExists(checkId: number) {
    const check =
      await this.prismaService.productionOrderSemiFinishedProductGrossWeightChecks.findUnique(
        {
          where: { id: checkId },
          select: { id: true },
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Semi-finished product gross weight check not found',
      );
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
