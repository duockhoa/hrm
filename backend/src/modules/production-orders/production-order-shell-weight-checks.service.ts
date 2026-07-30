import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderShellWeightCheckDto } from './dto/create-production-order-shell-weight-check.dto';
import { UpdateProductionOrderShellWeightCheckDto } from './dto/update-production-order-shell-weight-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const WEIGHT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const WEIGHT_INTEGER_DIGITS = 8;
const DEFAULT_WEIGHT_UNIT = 'mg';
const MAX_UNIT_LENGTH = 10;

const shellWeightCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const shellWeightCheckInclude = {
  createdBy: {
    select: shellWeightCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderShellWeightChecksInclude;

@Injectable()
export class ProductionOrderShellWeightChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderShellWeightChecks.findUnique({
        where: { id: checkId },
        include: shellWeightCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Shell weight check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderShellWeightChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: shellWeightCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderShellWeightCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderShellWeightChecks.create({
      data: {
        production_order_id: productionOrderId,
        shell_1_weight: this.normalizeRequiredWeight(
          dto?.shell_1_weight,
          'shell_1_weight',
        ),
        shell_2_weight: this.normalizeRequiredWeight(
          dto?.shell_2_weight,
          'shell_2_weight',
        ),
        shell_3_weight: this.normalizeRequiredWeight(
          dto?.shell_3_weight,
          'shell_3_weight',
        ),
        shell_4_weight: this.normalizeRequiredWeight(
          dto?.shell_4_weight,
          'shell_4_weight',
        ),
        shell_5_weight: this.normalizeRequiredWeight(
          dto?.shell_5_weight,
          'shell_5_weight',
        ),
        shell_6_weight: this.normalizeRequiredWeight(
          dto?.shell_6_weight,
          'shell_6_weight',
        ),
        shell_7_weight: this.normalizeRequiredWeight(
          dto?.shell_7_weight,
          'shell_7_weight',
        ),
        shell_8_weight: this.normalizeRequiredWeight(
          dto?.shell_8_weight,
          'shell_8_weight',
        ),
        shell_9_weight: this.normalizeRequiredWeight(
          dto?.shell_9_weight,
          'shell_9_weight',
        ),
        shell_10_weight: this.normalizeRequiredWeight(
          dto?.shell_10_weight,
          'shell_10_weight',
        ),
        unit: this.normalizeCreateUnit(dto?.unit, 'unit'),
        created_by_id: this.normalizeUserId(user),
      },
      include: shellWeightCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderShellWeightCheckDto) {
    await this.findById(checkId);

    return this.prismaService.productionOrderShellWeightChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: shellWeightCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderShellWeightChecks.delete({
      where: { id: checkId },
      include: shellWeightCheckInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateProductionOrderShellWeightCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderShellWeightChecksUpdateInput = {};
    const weightFields = [
      'shell_1_weight',
      'shell_2_weight',
      'shell_3_weight',
      'shell_4_weight',
      'shell_5_weight',
      'shell_6_weight',
      'shell_7_weight',
      'shell_8_weight',
      'shell_9_weight',
      'shell_10_weight',
    ] as const;

    for (const field of weightFields) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredWeight(updateDto[field], field);
      }
    }

    if ('unit' in updateDto) {
      data.unit = this.normalizeUnit(updateDto.unit, 'unit');
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
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

  private normalizeRequiredWeight(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    let normalizedValue: string;

    if (typeof value === 'number') {
      normalizedValue = String(value);
    } else if (typeof value === 'string') {
      normalizedValue = value.trim().replace(',', '.');
    } else {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 2) with up to 2 decimal places`,
      );
    }

    if (!WEIGHT_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 2) with up to 2 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > WEIGHT_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(10, 2)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeCreateUnit(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) {
      return DEFAULT_WEIGHT_UNIT;
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

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
