import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderLeakTightnessCheckDto } from './dto/create-production-order-leak-tightness-check.dto';
import { UpdateProductionOrderLeakTightnessCheckDto } from './dto/update-production-order-leak-tightness-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const REQUIRED_RESULT_FIELDS = ['unit_1_result'] as const;
const OPTIONAL_RESULT_FIELDS = [
  'unit_2_result',
  'unit_3_result',
  'unit_4_result',
  'unit_5_result',
  'unit_6_result',
  'unit_7_result',
  'unit_8_result',
  'unit_9_result',
  'unit_10_result',
] as const;

const MAX_DOSAGE_FORM_STAGE_LENGTH = 50;
const DEFAULT_LEAK_TIGHTNESS_REQUIREMENT =
  'Tần suất 30 phút/lần, cảm quan lọ kín, để ngang lọ và đập nhẹ vào tay không thấy dịch rỉ ra ngoài.';

const PASS_RESULT_TRUE_VALUES = new Set([
  'true',
  '1',
  'passed',
  'pass',
  'dat',
  'kin',
]);
const PASS_RESULT_FALSE_VALUES = new Set([
  'false',
  '0',
  'failed',
  'fail',
  'khong-dat',
  'khong-kin',
]);

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const leakTightnessCheckInclude = {
  createdBy: {
    select: creatorSelect,
  },
} satisfies Prisma.ProductionOrderLeakTightnessChecksInclude;

@Injectable()
export class ProductionOrderLeakTightnessChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderLeakTightnessChecks.findUnique({
        where: { id: checkId },
        include: leakTightnessCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Leak tightness check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderLeakTightnessChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: leakTightnessCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderLeakTightnessCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderLeakTightnessChecks.create({
      data: {
        production_order_id: productionOrderId,
        requirement: this.normalizeCreateRequirement(dto?.requirement),
        dosage_form_stage: this.normalizeOptionalDosageFormStage(
          dto?.dosage_form_stage,
        ),
        unit_1_result: this.normalizeRequiredResult(
          dto?.unit_1_result,
          'unit_1_result',
        ),
        unit_2_result: this.normalizeOptionalResult(
          dto?.unit_2_result,
          'unit_2_result',
        ),
        unit_3_result: this.normalizeOptionalResult(
          dto?.unit_3_result,
          'unit_3_result',
        ),
        unit_4_result: this.normalizeOptionalResult(
          dto?.unit_4_result,
          'unit_4_result',
        ),
        unit_5_result: this.normalizeOptionalResult(
          dto?.unit_5_result,
          'unit_5_result',
        ),
        unit_6_result: this.normalizeOptionalResult(
          dto?.unit_6_result,
          'unit_6_result',
        ),
        unit_7_result: this.normalizeOptionalResult(
          dto?.unit_7_result,
          'unit_7_result',
        ),
        unit_8_result: this.normalizeOptionalResult(
          dto?.unit_8_result,
          'unit_8_result',
        ),
        unit_9_result: this.normalizeOptionalResult(
          dto?.unit_9_result,
          'unit_9_result',
        ),
        unit_10_result: this.normalizeOptionalResult(
          dto?.unit_10_result,
          'unit_10_result',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: leakTightnessCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderLeakTightnessCheckDto,
  ) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderLeakTightnessChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: leakTightnessCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderLeakTightnessChecks.delete({
      where: { id: checkId },
      include: leakTightnessCheckInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateProductionOrderLeakTightnessCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderLeakTightnessChecksUpdateInput = {};

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

    for (const field of REQUIRED_RESULT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredResult(updateDto[field], field);
      }
    }

    for (const field of OPTIONAL_RESULT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalResult(updateDto[field], field);
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

    return value.trim() || null;
  }

  private normalizeCreateRequirement(value: unknown) {
    return (
      this.normalizeOptionalRequirement(value) ??
      DEFAULT_LEAK_TIGHTNESS_REQUIREMENT
    );
  }

  private normalizeOptionalDosageFormStage(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('dosage_form_stage must be a string');
    }

    const dosageFormStage = value.trim();

    if (!dosageFormStage) {
      return null;
    }

    if (dosageFormStage.length > MAX_DOSAGE_FORM_STAGE_LENGTH) {
      throw new BadRequestException(
        `dosage_form_stage must be at most ${MAX_DOSAGE_FORM_STAGE_LENGTH} characters`,
      );
    }

    return dosageFormStage;
  }

  private normalizeRequiredResult(value: unknown, fieldName: string) {
    if (this.isEmptyResult(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeResult(value, fieldName);
  }

  private normalizeOptionalResult(value: unknown, fieldName: string) {
    if (this.isEmptyResult(value)) {
      return null;
    }

    return this.normalizeResult(value, fieldName);
  }

  private isEmptyResult(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private normalizeResult(value: unknown, fieldName: string) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    const normalizedValue =
      typeof value === 'string'
        ? value
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\u0111/g, 'd')
            .replace(/[\s_]+/g, '-')
        : '';

    if (PASS_RESULT_TRUE_VALUES.has(normalizedValue)) {
      return true;
    }

    if (PASS_RESULT_FALSE_VALUES.has(normalizedValue)) {
      return false;
    }

    throw new BadRequestException(
      `${fieldName} must be a boolean or pass/fail value`,
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

  private async ensureCheckExists(checkId: number) {
    const check =
      await this.prismaService.productionOrderLeakTightnessChecks.findUnique({
        where: { id: checkId },
        select: { id: true },
      });

    if (!check) {
      throw new NotFoundException('Leak tightness check not found');
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
