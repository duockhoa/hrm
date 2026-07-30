import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderTenShellWeightCheckDto } from './dto/create-production-order-ten-shell-weight-check.dto';
import { UpdateProductionOrderTenShellWeightCheckDto } from './dto/update-production-order-ten-shell-weight-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const WEIGHT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const WEIGHT_INTEGER_DIGITS = 8;
const DEFAULT_WEIGHT_UNIT = 'mg';
const MAX_UNIT_LENGTH = 10;

const tenShellWeightCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const tenShellWeightCheckInclude = {
  createdBy: {
    select: tenShellWeightCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderTenShellWeightChecksInclude;

@Injectable()
export class ProductionOrderTenShellWeightChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderTenShellWeightChecks.findUnique({
        where: { id: checkId },
        include: tenShellWeightCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Ten-shell weight check not found');
    }

    return check;
  }

  async findByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderTenShellWeightChecks.findUnique({
      where: {
        production_order_id: productionOrderId,
      },
      include: tenShellWeightCheckInclude,
    });
  }

  async upsert(
    productionOrderId: number,
    dto: CreateProductionOrderTenShellWeightCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const tenShellsWeight = this.normalizeRequiredWeight(
      dto?.ten_shells_weight,
      'ten_shells_weight',
    );
    const updateDto = dto ?? {};
    const createData = {
      production_order_id: productionOrderId,
      ten_shells_weight: tenShellsWeight,
      unit: this.normalizeCreateUnit(dto?.unit, 'unit'),
      created_by_id: this.normalizeUserId(user),
    };
    const updateData: Prisma.ProductionOrderTenShellWeightChecksUpdateInput = {
      ten_shells_weight: tenShellsWeight,
    };

    if ('unit' in updateDto) {
      updateData.unit = this.normalizeUnit(dto.unit, 'unit');
    }

    return this.prismaService.productionOrderTenShellWeightChecks.upsert({
      where: {
        production_order_id: productionOrderId,
      },
      create: createData,
      update: updateData,
      include: tenShellWeightCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderTenShellWeightCheckDto,
  ) {
    await this.findById(checkId);

    return this.prismaService.productionOrderTenShellWeightChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: tenShellWeightCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderTenShellWeightChecks.delete({
      where: { id: checkId },
      include: tenShellWeightCheckInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateProductionOrderTenShellWeightCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderTenShellWeightChecksUpdateInput = {};

    if ('ten_shells_weight' in updateDto) {
      data.ten_shells_weight = this.normalizeRequiredWeight(
        updateDto.ten_shells_weight,
        'ten_shells_weight',
      );
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
      if (!Number.isFinite(value)) {
        throw new BadRequestException(`${fieldName} must be a valid number`);
      }

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
