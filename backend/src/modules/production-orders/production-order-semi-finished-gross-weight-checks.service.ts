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
const GROSS_WEIGHT_FIELDS = [
  'unit_1_gross_weight',
  'unit_2_gross_weight',
  'unit_3_gross_weight',
  'unit_4_gross_weight',
  'unit_5_gross_weight',
  'unit_6_gross_weight',
] as const;

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
          requirement: this.normalizeRequirement(dto?.requirement),
          ...this.normalizeRequiredWeights(dto),
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

  private normalizeRequiredWeights(
    dto: CreateProductionOrderSemiFinishedGrossWeightCheckDto,
  ) {
    return Object.fromEntries(
      GROSS_WEIGHT_FIELDS.map((field) => [
        field,
        this.normalizeGrossWeight(dto?.[field], field),
      ]),
    ) as Record<(typeof GROSS_WEIGHT_FIELDS)[number], Prisma.Decimal>;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSemiFinishedGrossWeightCheckDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSemiFinishedProductGrossWeightChecksUpdateInput =
      {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequirement(updateDto.requirement);
    }

    for (const field of GROSS_WEIGHT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeGrossWeight(updateDto[field], field);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeRequirement(value: unknown) {
    if (value === null || value === undefined) {
      throw new BadRequestException('requirement is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('requirement must be a string');
    }

    const requirement = value.trim();

    if (!requirement) {
      throw new BadRequestException('requirement is required');
    }

    return requirement;
  }

  private normalizeGrossWeight(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

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
