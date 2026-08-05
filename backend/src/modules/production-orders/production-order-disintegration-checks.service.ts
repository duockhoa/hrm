import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderDisintegrationCheckDto } from './dto/create-production-order-disintegration-check.dto';
import { UpdateProductionOrderDisintegrationCheckDto } from './dto/update-production-order-disintegration-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const disintegrationCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const disintegrationCheckInclude = {
  createdBy: {
    select: disintegrationCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderDisintegrationChecksInclude;

const PASS_RESULT_TRUE_VALUES = new Set(['true', '1', 'passed', 'pass', 'dat']);
const PASS_RESULT_FALSE_VALUES = new Set([
  'false',
  '0',
  'failed',
  'fail',
  'khong-dat',
]);

const OPTIONAL_PASS_RESULT_FIELDS = [
  'unit_2_passed',
  'unit_3_passed',
  'unit_4_passed',
  'unit_5_passed',
  'unit_6_passed',
] as const;

@Injectable()
export class ProductionOrderDisintegrationChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const disintegrationCheck =
      await this.prismaService.productionOrderDisintegrationChecks.findUnique({
        where: {
          id: checkId,
        },
        include: disintegrationCheckInclude,
      });

    if (!disintegrationCheck) {
      throw new NotFoundException('Disintegration check not found');
    }

    return disintegrationCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDisintegrationChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: disintegrationCheckInclude,
      orderBy: [
        {
          checked_at: 'desc',
        },
        {
          created_at: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderDisintegrationCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDisintegrationChecks.create({
      data: {
        production_order_id: productionOrderId,
        requirement: this.normalizeOptionalText(
          dto?.requirement,
          'requirement',
        ),
        dosage_form_stage: this.normalizeRequiredString(
          dto?.dosage_form_stage,
          'dosage_form_stage',
        ),
        unit_1_passed: this.normalizePassResult(
          dto?.unit_1_passed,
          'unit_1_passed',
        ),
        unit_2_passed: this.normalizeOptionalPassResult(
          dto?.unit_2_passed,
          'unit_2_passed',
        ),
        unit_3_passed: this.normalizeOptionalPassResult(
          dto?.unit_3_passed,
          'unit_3_passed',
        ),
        unit_4_passed: this.normalizeOptionalPassResult(
          dto?.unit_4_passed,
          'unit_4_passed',
        ),
        unit_5_passed: this.normalizeOptionalPassResult(
          dto?.unit_5_passed,
          'unit_5_passed',
        ),
        unit_6_passed: this.normalizeOptionalPassResult(
          dto?.unit_6_passed,
          'unit_6_passed',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: disintegrationCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderDisintegrationCheckDto,
  ) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderDisintegrationChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: disintegrationCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderDisintegrationChecks.delete({
      where: { id: checkId },
      include: disintegrationCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderDisintegrationCheckDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderDisintegrationChecksUpdateInput = {};

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeOptionalText(
        updateDto.requirement,
        'requirement',
      );
    }

    if ('dosage_form_stage' in updateDto) {
      data.dosage_form_stage = this.normalizeRequiredString(
        updateDto.dosage_form_stage,
        'dosage_form_stage',
      );
    }

    if ('unit_1_passed' in updateDto) {
      data.unit_1_passed = this.normalizePassResult(
        updateDto.unit_1_passed,
        'unit_1_passed',
      );
    }

    for (const field of OPTIONAL_PASS_RESULT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalPassResult(updateDto[field], field);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id: productionOrderId,
        },
        select: {
          id: true,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async ensureCheckExists(checkId: number) {
    const disintegrationCheck =
      await this.prismaService.productionOrderDisintegrationChecks.findUnique({
        where: { id: checkId },
        select: { id: true },
      });

    if (!disintegrationCheck) {
      throw new NotFoundException('Disintegration check not found');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
  }

  private normalizePassResult(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof value === 'string' && value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizePassResultValue(value, fieldName);
  }

  private normalizeOptionalPassResult(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    return this.normalizePassResultValue(value, fieldName);
  }

  private normalizePassResultValue(value: unknown, fieldName: string) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }
    }

    const normalizedValue = String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/\u0110/g, 'd')
      .replace(/[\s_]+/g, '-');

    if (PASS_RESULT_TRUE_VALUES.has(normalizedValue)) {
      return true;
    }

    if (PASS_RESULT_FALSE_VALUES.has(normalizedValue)) {
      return false;
    }

    throw new BadRequestException(`${fieldName} must be pass or fail`);
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
