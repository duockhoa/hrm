import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderTabletThicknessCheckDto } from './dto/create-production-order-tablet-thickness-check.dto';
import { UpdateProductionOrderTabletThicknessCheckDto } from './dto/update-production-order-tablet-thickness-check.dto';

type AuthenticatedUser = { id?: number | string | null };

const DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const INTEGER_DIGITS = 7;
const DEFAULT_UNIT = 'mm';
const MAX_UNIT_LENGTH = 10;
const MAX_DOSAGE_FORM_STAGE_LENGTH = 50;
const REQUIRED_FIELDS = ['unit_1_thickness'] as const;
const OPTIONAL_FIELDS = [
  'unit_2_thickness',
  'unit_3_thickness',
  'unit_4_thickness',
  'unit_5_thickness',
  'unit_6_thickness',
  'unit_7_thickness',
  'unit_8_thickness',
  'unit_9_thickness',
  'unit_10_thickness',
] as const;

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const thicknessCheckInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.ProductionOrderTabletThicknessChecksInclude;

@Injectable()
export class ProductionOrderTabletThicknessChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderTabletThicknessChecks.findUnique({
        where: { id: checkId },
        include: thicknessCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Tablet thickness check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderTabletThicknessChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: thicknessCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderTabletThicknessCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderTabletThicknessChecks.create({
      data: {
        production_order_id: productionOrderId,
        requirement: this.normalizeOptionalText(
          dto?.requirement,
          'requirement',
        ),
        dosage_form_stage: this.normalizeOptionalDosageFormStage(
          dto?.dosage_form_stage,
        ),
        ...this.normalizeCreateThicknessValues(dto),
        unit: this.normalizeCreateUnit(dto?.unit),
        created_by_id: this.normalizeUserId(user),
      },
      include: thicknessCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderTabletThicknessCheckDto,
  ) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderTabletThicknessChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: thicknessCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderTabletThicknessChecks.delete({
      where: { id: checkId },
      include: thicknessCheckInclude,
    });
  }

  private normalizeCreateThicknessValues(
    dto: CreateProductionOrderTabletThicknessCheckDto,
  ) {
    const data: Record<string, Prisma.Decimal | null> = {
      unit_1_thickness: this.normalizeRequiredThickness(
        dto?.unit_1_thickness,
        'unit_1_thickness',
      ),
    };

    for (const field of OPTIONAL_FIELDS) {
      data[field] = this.normalizeOptionalThickness(dto?.[field], field);
    }

    return data as {
      unit_1_thickness: Prisma.Decimal;
      unit_2_thickness: Prisma.Decimal | null;
      unit_3_thickness: Prisma.Decimal | null;
      unit_4_thickness: Prisma.Decimal | null;
      unit_5_thickness: Prisma.Decimal | null;
      unit_6_thickness: Prisma.Decimal | null;
      unit_7_thickness: Prisma.Decimal | null;
      unit_8_thickness: Prisma.Decimal | null;
      unit_9_thickness: Prisma.Decimal | null;
      unit_10_thickness: Prisma.Decimal | null;
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderTabletThicknessCheckDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderTabletThicknessChecksUpdateInput = {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeOptionalText(
        updateDto.requirement,
        'requirement',
      );
    }

    if ('dosage_form_stage' in updateDto) {
      data.dosage_form_stage = this.normalizeOptionalDosageFormStage(
        updateDto.dosage_form_stage,
      );
    }

    if ('unit' in updateDto) {
      data.unit = this.normalizeUnit(updateDto.unit);
    }

    for (const field of REQUIRED_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredThickness(updateDto[field], field);
      }
    }

    for (const field of OPTIONAL_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalThickness(updateDto[field], field);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (this.isEmptyText(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    return value.trim();
  }

  private normalizeOptionalDosageFormStage(value: unknown) {
    if (this.isEmptyText(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('dosage_form_stage must be a string');
    }

    const dosageFormStage = value.trim();

    if (dosageFormStage.length > MAX_DOSAGE_FORM_STAGE_LENGTH) {
      throw new BadRequestException(
        `dosage_form_stage must be at most ${MAX_DOSAGE_FORM_STAGE_LENGTH} characters`,
      );
    }

    return dosageFormStage;
  }

  private normalizeCreateUnit(value: unknown) {
    return this.isEmptyText(value) ? DEFAULT_UNIT : this.normalizeUnit(value);
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

  private normalizeRequiredThickness(value: unknown, fieldName: string) {
    if (this.isEmptyThickness(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeThicknessValue(value, fieldName);
  }

  private normalizeOptionalThickness(value: unknown, fieldName: string) {
    return this.isEmptyThickness(value)
      ? null
      : this.normalizeThicknessValue(value, fieldName);
  }

  private isEmptyThickness(value: unknown) {
    return this.isEmptyText(value);
  }

  private isEmptyText(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private normalizeThicknessValue(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > INTEGER_DIGITS) {
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
      await this.prismaService.productionOrderTabletThicknessChecks.findUnique({
        where: { id: checkId },
        select: { id: true },
      });

    if (!check) {
      throw new NotFoundException('Tablet thickness check not found');
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
