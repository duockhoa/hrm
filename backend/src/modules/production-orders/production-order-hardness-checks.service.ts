import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderHardnessCheckDto } from './dto/create-production-order-hardness-check.dto';
import { UpdateProductionOrderHardnessCheckDto } from './dto/update-production-order-hardness-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const HARDNESS_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const HARDNESS_INTEGER_DIGITS = 7;
const DEFAULT_HARDNESS_UNIT = 'N';
const MAX_UNIT_LENGTH = 10;
const MAX_DOSAGE_FORM_STAGE_LENGTH = 50;
const REQUIRED_HARDNESS_FIELDS = ['unit_1_hardness'] as const;
const OPTIONAL_HARDNESS_FIELDS = [
  'unit_2_hardness',
  'unit_3_hardness',
  'unit_4_hardness',
  'unit_5_hardness',
  'unit_6_hardness',
  'unit_7_hardness',
  'unit_8_hardness',
  'unit_9_hardness',
  'unit_10_hardness',
] as const;

type CreateHardnessData = {
  unit_1_hardness: Prisma.Decimal;
  unit_2_hardness: Prisma.Decimal | null;
  unit_3_hardness: Prisma.Decimal | null;
  unit_4_hardness: Prisma.Decimal | null;
  unit_5_hardness: Prisma.Decimal | null;
  unit_6_hardness: Prisma.Decimal | null;
  unit_7_hardness: Prisma.Decimal | null;
  unit_8_hardness: Prisma.Decimal | null;
  unit_9_hardness: Prisma.Decimal | null;
  unit_10_hardness: Prisma.Decimal | null;
};

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const hardnessCheckInclude = {
  createdBy: {
    select: creatorSelect,
  },
} satisfies Prisma.ProductionOrderHardnessChecksInclude;

@Injectable()
export class ProductionOrderHardnessChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderHardnessChecks.findUnique({
        where: { id: checkId },
        include: hardnessCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Hardness check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderHardnessChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: hardnessCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderHardnessCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderHardnessChecks.create({
      data: {
        production_order_id: productionOrderId,
        requirement: this.normalizeOptionalRequirement(dto?.requirement),
        dosage_form_stage: this.normalizeOptionalDosageFormStage(
          dto?.dosage_form_stage,
        ),
        ...this.normalizeCreateHardnessValues(dto),
        unit: this.normalizeCreateUnit(dto?.unit),
        created_by_id: this.normalizeUserId(user),
      },
      include: hardnessCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderHardnessCheckDto) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderHardnessChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: hardnessCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderHardnessChecks.delete({
      where: { id: checkId },
      include: hardnessCheckInclude,
    });
  }

  private normalizeCreateHardnessValues(
    dto: CreateProductionOrderHardnessCheckDto,
  ): CreateHardnessData {
    return {
      unit_1_hardness: this.normalizeRequiredHardness(
        dto?.unit_1_hardness,
        'unit_1_hardness',
      ),
      unit_2_hardness: this.normalizeOptionalHardness(
        dto?.unit_2_hardness,
        'unit_2_hardness',
      ),
      unit_3_hardness: this.normalizeOptionalHardness(
        dto?.unit_3_hardness,
        'unit_3_hardness',
      ),
      unit_4_hardness: this.normalizeOptionalHardness(
        dto?.unit_4_hardness,
        'unit_4_hardness',
      ),
      unit_5_hardness: this.normalizeOptionalHardness(
        dto?.unit_5_hardness,
        'unit_5_hardness',
      ),
      unit_6_hardness: this.normalizeOptionalHardness(
        dto?.unit_6_hardness,
        'unit_6_hardness',
      ),
      unit_7_hardness: this.normalizeOptionalHardness(
        dto?.unit_7_hardness,
        'unit_7_hardness',
      ),
      unit_8_hardness: this.normalizeOptionalHardness(
        dto?.unit_8_hardness,
        'unit_8_hardness',
      ),
      unit_9_hardness: this.normalizeOptionalHardness(
        dto?.unit_9_hardness,
        'unit_9_hardness',
      ),
      unit_10_hardness: this.normalizeOptionalHardness(
        dto?.unit_10_hardness,
        'unit_10_hardness',
      ),
    };
  }

  private normalizeUpdateData(dto: UpdateProductionOrderHardnessCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderHardnessChecksUpdateInput = {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeOptionalRequirement(
        updateDto.requirement,
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

    for (const field of REQUIRED_HARDNESS_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredHardness(updateDto[field], field);
      }
    }

    for (const field of OPTIONAL_HARDNESS_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalHardness(updateDto[field], field);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeOptionalRequirement(value: unknown) {
    if (this.isEmptyText(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('requirement must be a string');
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
    if (this.isEmptyText(value)) {
      return DEFAULT_HARDNESS_UNIT;
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

  private normalizeRequiredHardness(value: unknown, fieldName: string) {
    if (this.isEmptyHardness(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeHardnessValue(value, fieldName);
  }

  private normalizeOptionalHardness(value: unknown, fieldName: string) {
    if (this.isEmptyHardness(value)) {
      return null;
    }

    return this.normalizeHardnessValue(value, fieldName);
  }

  private isEmptyHardness(value: unknown) {
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

  private normalizeHardnessValue(value: unknown, fieldName: string) {
    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!HARDNESS_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > HARDNESS_INTEGER_DIGITS) {
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
      await this.prismaService.productionOrderHardnessChecks.findUnique({
        where: { id: checkId },
        select: { id: true },
      });

    if (!check) {
      throw new NotFoundException('Hardness check not found');
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
