import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFriabilityCheckDto } from './dto/create-production-order-friability-check.dto';
import { UpdateProductionOrderFriabilityCheckDto } from './dto/update-production-order-friability-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const FRIABILITY_WEIGHT_UNIT = 'mg';
const WEIGHT_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const WEIGHT_INTEGER_DIGITS = 9;

const friabilityCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const friabilityCheckInclude = {
  createdBy: {
    select: friabilityCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderFriabilityChecksInclude;

const friabilityCheckWeightSelect = {
  id: true,
  total_weight_before_check: true,
  total_weight_after_check: true,
} satisfies Prisma.ProductionOrderFriabilityChecksSelect;

type FriabilityCheckWeights = Prisma.ProductionOrderFriabilityChecksGetPayload<{
  select: typeof friabilityCheckWeightSelect;
}>;

@Injectable()
export class ProductionOrderFriabilityChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const friabilityCheck =
      await this.prismaService.productionOrderFriabilityChecks.findUnique({
        where: {
          id: checkId,
        },
        include: friabilityCheckInclude,
      });

    if (!friabilityCheck) {
      throw new NotFoundException('Friability check not found');
    }

    return friabilityCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderFriabilityChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: friabilityCheckInclude,
      orderBy: [
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
    dto: CreateProductionOrderFriabilityCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const totalWeightBeforeCheck = this.normalizeRequiredWeight(
      dto?.total_weight_before_check,
      'total_weight_before_check',
    );
    const totalWeightAfterCheck = this.normalizeRequiredWeight(
      dto?.total_weight_after_check,
      'total_weight_after_check',
    );
    const friabilityPercent = this.calculateFriabilityPercent(
      totalWeightBeforeCheck,
      totalWeightAfterCheck,
    );

    return this.prismaService.productionOrderFriabilityChecks.create({
      data: {
        production_order_id: productionOrderId,
        total_weight_before_check: totalWeightBeforeCheck,
        total_weight_after_check: totalWeightAfterCheck,
        weight_unit: FRIABILITY_WEIGHT_UNIT,
        friability_percent: friabilityPercent,
        created_by_id: this.normalizeUserId(user),
      },
      include: friabilityCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderFriabilityCheckDto) {
    const existingCheck = await this.findWeightsByIdOrThrow(checkId);

    return this.prismaService.productionOrderFriabilityChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto, existingCheck),
      include: friabilityCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findWeightsByIdOrThrow(checkId);

    return this.prismaService.productionOrderFriabilityChecks.delete({
      where: { id: checkId },
      include: friabilityCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderFriabilityCheckDto,
    existingCheck: FriabilityCheckWeights,
  ) {
    const updateDto = dto ?? {};
    const hasBeforeWeight = 'total_weight_before_check' in updateDto;
    const hasAfterWeight = 'total_weight_after_check' in updateDto;

    if (!hasBeforeWeight && !hasAfterWeight) {
      throw new BadRequestException('At least one field is required');
    }

    const totalWeightBeforeCheck = hasBeforeWeight
      ? this.normalizeRequiredWeight(
          updateDto.total_weight_before_check,
          'total_weight_before_check',
        )
      : existingCheck.total_weight_before_check;
    const totalWeightAfterCheck = hasAfterWeight
      ? this.normalizeRequiredWeight(
          updateDto.total_weight_after_check,
          'total_weight_after_check',
        )
      : existingCheck.total_weight_after_check;
    const data: Prisma.ProductionOrderFriabilityChecksUpdateInput = {
      friability_percent: this.calculateFriabilityPercent(
        totalWeightBeforeCheck,
        totalWeightAfterCheck,
      ),
    };

    if (hasBeforeWeight) {
      data.total_weight_before_check = totalWeightBeforeCheck;
    }

    if (hasAfterWeight) {
      data.total_weight_after_check = totalWeightAfterCheck;
    }

    return data;
  }

  private calculateFriabilityPercent(
    totalWeightBeforeCheck: Prisma.Decimal,
    totalWeightAfterCheck: Prisma.Decimal,
  ) {
    if (totalWeightAfterCheck.gt(totalWeightBeforeCheck)) {
      throw new BadRequestException(
        'total_weight_after_check must be less than or equal to total_weight_before_check',
      );
    }

    return new Prisma.Decimal(
      totalWeightBeforeCheck
        .minus(totalWeightAfterCheck)
        .div(totalWeightBeforeCheck)
        .mul(100)
        .toFixed(4),
    );
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

  private async findWeightsByIdOrThrow(checkId: number) {
    const friabilityCheck =
      await this.prismaService.productionOrderFriabilityChecks.findUnique({
        where: { id: checkId },
        select: friabilityCheckWeightSelect,
      });

    if (!friabilityCheck) {
      throw new NotFoundException('Friability check not found');
    }

    return friabilityCheck;
  }

  private normalizeRequiredWeight(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : String(value).trim().replace(',', '.');

    if (normalizedValue === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (!WEIGHT_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > WEIGHT_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
