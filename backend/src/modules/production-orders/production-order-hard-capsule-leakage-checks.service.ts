import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderHardCapsuleLeakageCheckDto } from './dto/create-production-order-hard-capsule-leakage-check.dto';
import { UpdateProductionOrderHardCapsuleLeakageCheckDto } from './dto/update-production-order-hard-capsule-leakage-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

export const HARD_CAPSULE_LEAKAGE_CHECK_STAGES = {
  BEFORE_COATING: 'before_coating',
  AFTER_COATING: 'after_coating',
} as const;

const hardCapsuleLeakageCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const hardCapsuleLeakageCheckInclude = {
  createdBy: {
    select: hardCapsuleLeakageCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderHardCapsuleLeakageChecksInclude;

const hardCapsuleLeakageCheckValidationSelect = {
  id: true,
  tested_capsule_count: true,
  leaked_capsule_count: true,
} satisfies Prisma.ProductionOrderHardCapsuleLeakageChecksSelect;

type HardCapsuleLeakageCheckValidationData =
  Prisma.ProductionOrderHardCapsuleLeakageChecksGetPayload<{
    select: typeof hardCapsuleLeakageCheckValidationSelect;
  }>;

const HARD_CAPSULE_LEAKAGE_CHECK_STAGE_ALIASES = new Map([
  ['before-coating', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.BEFORE_COATING],
  ['before', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.BEFORE_COATING],
  ['truoc-bao', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.BEFORE_COATING],
  ['after-coating', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.AFTER_COATING],
  ['after', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.AFTER_COATING],
  ['sau-bao', HARD_CAPSULE_LEAKAGE_CHECK_STAGES.AFTER_COATING],
]);

@Injectable()
export class ProductionOrderHardCapsuleLeakageChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const hardCapsuleLeakageCheck =
      await this.prismaService.productionOrderHardCapsuleLeakageChecks.findUnique(
        {
          where: {
            id: checkId,
          },
          include: hardCapsuleLeakageCheckInclude,
        },
      );

    if (!hardCapsuleLeakageCheck) {
      throw new NotFoundException('Hard capsule leakage check not found');
    }

    return hardCapsuleLeakageCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderHardCapsuleLeakageChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: hardCapsuleLeakageCheckInclude,
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
    dto: CreateProductionOrderHardCapsuleLeakageCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const testedCapsuleCount = this.normalizeRequiredInteger(
      dto?.tested_capsule_count,
      'tested_capsule_count',
      1,
    );
    const leakedCapsuleCount = this.normalizeRequiredInteger(
      dto?.leaked_capsule_count,
      'leaked_capsule_count',
      0,
    );

    if (leakedCapsuleCount > testedCapsuleCount) {
      throw new BadRequestException(
        'leaked_capsule_count cannot exceed tested_capsule_count',
      );
    }

    return this.prismaService.productionOrderHardCapsuleLeakageChecks.create({
      data: {
        production_order_id: productionOrderId,
        stage: this.normalizeStage(dto?.stage),
        tested_capsule_count: testedCapsuleCount,
        leaked_capsule_count: leakedCapsuleCount,
        created_by_id: this.normalizeUserId(user),
      },
      include: hardCapsuleLeakageCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderHardCapsuleLeakageCheckDto,
  ) {
    const existingCheck = await this.findValidationDataByIdOrThrow(checkId);

    return this.prismaService.productionOrderHardCapsuleLeakageChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto, existingCheck),
      include: hardCapsuleLeakageCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findValidationDataByIdOrThrow(checkId);

    return this.prismaService.productionOrderHardCapsuleLeakageChecks.delete({
      where: { id: checkId },
      include: hardCapsuleLeakageCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderHardCapsuleLeakageCheckDto,
    existingCheck: HardCapsuleLeakageCheckValidationData,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderHardCapsuleLeakageChecksUpdateInput = {};
    const hasStage = 'stage' in updateDto;
    const hasTestedCapsuleCount = 'tested_capsule_count' in updateDto;
    const hasLeakedCapsuleCount = 'leaked_capsule_count' in updateDto;

    if (!hasStage && !hasTestedCapsuleCount && !hasLeakedCapsuleCount) {
      throw new BadRequestException('At least one field is required');
    }

    if (hasStage) {
      data.stage = this.normalizeStage(updateDto.stage);
    }

    const testedCapsuleCount = hasTestedCapsuleCount
      ? this.normalizeRequiredInteger(
          updateDto.tested_capsule_count,
          'tested_capsule_count',
          1,
        )
      : existingCheck.tested_capsule_count;
    const leakedCapsuleCount = hasLeakedCapsuleCount
      ? this.normalizeRequiredInteger(
          updateDto.leaked_capsule_count,
          'leaked_capsule_count',
          0,
        )
      : existingCheck.leaked_capsule_count;

    if (leakedCapsuleCount > testedCapsuleCount) {
      throw new BadRequestException(
        'leaked_capsule_count cannot exceed tested_capsule_count',
      );
    }

    if (hasTestedCapsuleCount) {
      data.tested_capsule_count = testedCapsuleCount;
    }

    if (hasLeakedCapsuleCount) {
      data.leaked_capsule_count = leakedCapsuleCount;
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

  private async findValidationDataByIdOrThrow(checkId: number) {
    const hardCapsuleLeakageCheck =
      await this.prismaService.productionOrderHardCapsuleLeakageChecks.findUnique(
        {
          where: { id: checkId },
          select: hardCapsuleLeakageCheckValidationSelect,
        },
      );

    if (!hardCapsuleLeakageCheck) {
      throw new NotFoundException('Hard capsule leakage check not found');
    }

    return hardCapsuleLeakageCheck;
  }

  private normalizeStage(value: unknown) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('stage is required');
    }

    const normalizedValue = value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd')
      .replace(/[\s_]+/g, '-');
    const stage = HARD_CAPSULE_LEAKAGE_CHECK_STAGE_ALIASES.get(normalizedValue);

    if (!stage) {
      throw new BadRequestException(
        'stage must be before_coating or after_coating',
      );
    }

    return stage;
  }

  private normalizeRequiredInteger(
    value: unknown,
    fieldName: string,
    minimum: number,
  ) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    let normalizedValue: number;

    if (typeof value === 'number') {
      normalizedValue = value;
    } else if (typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())) {
      normalizedValue = Number(value.trim());
    } else {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (!Number.isSafeInteger(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (normalizedValue < minimum) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${minimum}`,
      );
    }

    return normalizedValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
