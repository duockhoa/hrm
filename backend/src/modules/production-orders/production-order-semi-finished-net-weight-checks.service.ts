import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSemiFinishedNetWeightCheckDto } from './dto/create-production-order-semi-finished-net-weight-check.dto';
import { UpdateProductionOrderSemiFinishedNetWeightCheckDto } from './dto/update-production-order-semi-finished-net-weight-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const NET_WEIGHT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const NET_WEIGHT_INTEGER_DIGITS = 7;
const DEFAULT_WEIGHT_UNIT = 'g';
const MAX_UNIT_LENGTH = 10;
const REQUIRED_NET_WEIGHT_FIELDS = ['unit_1_net_weight'] as const;
const OPTIONAL_NET_WEIGHT_FIELDS = [
  'unit_2_net_weight',
  'unit_3_net_weight',
  'unit_4_net_weight',
  'unit_5_net_weight',
  'unit_6_net_weight',
  'unit_7_net_weight',
  'unit_8_net_weight',
  'unit_9_net_weight',
  'unit_10_net_weight',
] as const;

type CreateNetWeightData = {
  unit_1_net_weight: Prisma.Decimal;
  unit_2_net_weight: Prisma.Decimal | null;
  unit_3_net_weight: Prisma.Decimal | null;
  unit_4_net_weight: Prisma.Decimal | null;
  unit_5_net_weight: Prisma.Decimal | null;
  unit_6_net_weight: Prisma.Decimal | null;
  unit_7_net_weight: Prisma.Decimal | null;
  unit_8_net_weight: Prisma.Decimal | null;
  unit_9_net_weight: Prisma.Decimal | null;
  unit_10_net_weight: Prisma.Decimal | null;
};

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const netWeightCheckInclude = {
  createdBy: {
    select: creatorSelect,
  },
} satisfies Prisma.ProductionOrderSemiFinishedProductNetWeightChecksInclude;

@Injectable()
export class ProductionOrderSemiFinishedNetWeightChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique(
        {
          where: { id: checkId },
          include: netWeightCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Semi-finished product net weight check not found',
      );
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.findMany(
      {
        where: { production_order_id: productionOrderId },
        include: netWeightCheckInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSemiFinishedNetWeightCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.create(
      {
        data: {
          production_order_id: productionOrderId,
          requirement: this.normalizeOptionalRequirement(dto?.requirement),
          ...this.normalizeCreateWeights(dto),
          unit: this.normalizeCreateUnit(dto?.unit),
          created_by_id: this.normalizeUserId(user),
        },
        include: netWeightCheckInclude,
      },
    );
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderSemiFinishedNetWeightCheckDto,
  ) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.update(
      {
        where: { id: checkId },
        data: this.normalizeUpdateData(dto),
        include: netWeightCheckInclude,
      },
    );
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.delete(
      {
        where: { id: checkId },
        include: netWeightCheckInclude,
      },
    );
  }

  private normalizeCreateWeights(
    dto: CreateProductionOrderSemiFinishedNetWeightCheckDto,
  ): CreateNetWeightData {
    return {
      unit_1_net_weight: this.normalizeRequiredNetWeight(
        dto?.unit_1_net_weight,
        'unit_1_net_weight',
      ),
      unit_2_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_2_net_weight,
        'unit_2_net_weight',
      ),
      unit_3_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_3_net_weight,
        'unit_3_net_weight',
      ),
      unit_4_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_4_net_weight,
        'unit_4_net_weight',
      ),
      unit_5_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_5_net_weight,
        'unit_5_net_weight',
      ),
      unit_6_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_6_net_weight,
        'unit_6_net_weight',
      ),
      unit_7_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_7_net_weight,
        'unit_7_net_weight',
      ),
      unit_8_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_8_net_weight,
        'unit_8_net_weight',
      ),
      unit_9_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_9_net_weight,
        'unit_9_net_weight',
      ),
      unit_10_net_weight: this.normalizeOptionalNetWeight(
        dto?.unit_10_net_weight,
        'unit_10_net_weight',
      ),
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSemiFinishedNetWeightCheckDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSemiFinishedProductNetWeightChecksUpdateInput =
      {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeOptionalRequirement(
        updateDto.requirement,
      );
    }

    if ('unit' in updateDto) {
      data.unit = this.normalizeUnit(updateDto.unit);
    }

    for (const field of REQUIRED_NET_WEIGHT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredNetWeight(
          updateDto[field],
          field,
        );
      }
    }

    for (const field of OPTIONAL_NET_WEIGHT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalNetWeight(updateDto[field], field);
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

  private normalizeCreateUnit(value: unknown) {
    if (this.isEmptyText(value)) {
      return DEFAULT_WEIGHT_UNIT;
    }

    return this.normalizeUnit(value);
  }

  private normalizeUnit(value: unknown) {
    if (this.isEmptyText(value)) {
      throw new BadRequestException('unit is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('unit must be a string');
    }

    const unit = value.trim();

    if (unit.length > MAX_UNIT_LENGTH) {
      throw new BadRequestException(
        `unit must be at most ${MAX_UNIT_LENGTH} characters`,
      );
    }

    return unit;
  }

  private normalizeRequiredNetWeight(value: unknown, fieldName: string) {
    if (this.isEmptyNetWeight(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeNetWeightValue(value, fieldName);
  }

  private normalizeOptionalNetWeight(value: unknown, fieldName: string) {
    if (this.isEmptyNetWeight(value)) {
      return null;
    }

    return this.normalizeNetWeightValue(value, fieldName);
  }

  private isEmptyNetWeight(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private isEmptyText(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private normalizeNetWeightValue(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!NET_WEIGHT_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > NET_WEIGHT_INTEGER_DIGITS) {
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
      await this.prismaService.productionOrderSemiFinishedProductNetWeightChecks.findUnique(
        {
          where: { id: checkId },
          select: { id: true },
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Semi-finished product net weight check not found',
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
