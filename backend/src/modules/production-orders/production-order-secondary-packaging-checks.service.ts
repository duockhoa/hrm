import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSecondaryPackagingCheckDto } from './dto/create-production-order-secondary-packaging-check.dto';
import { UpdateProductionOrderSecondaryPackagingCheckDto } from './dto/update-production-order-secondary-packaging-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const secondaryPackagingCheckInspectorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const secondaryPackagingCheckInclude = {
  checkedBy: {
    select: secondaryPackagingCheckInspectorSelect,
  },
} satisfies Prisma.ProductionOrderSecondaryPackagingChecksInclude;

@Injectable()
export class ProductionOrderSecondaryPackagingChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderSecondaryPackagingChecks.findUnique(
        {
          where: { id: checkId },
          include: secondaryPackagingCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException('Secondary packaging check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSecondaryPackagingChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: secondaryPackagingCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSecondaryPackagingCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const quantityChecked = this.normalizeQuantity(
      dto?.quantity_checked,
      'quantity_checked',
      true,
    );
    const quantityPassed = this.normalizeQuantity(
      dto?.quantity_passed,
      'quantity_passed',
      false,
    );
    this.ensurePassedQuantityIsValid(quantityChecked, quantityPassed);

    return this.prismaService.productionOrderSecondaryPackagingChecks.create({
      data: {
        production_order_id: productionOrderId,
        stage: this.normalizeRequiredString(dto?.stage, 'stage', 100),
        requirement: this.normalizeRequiredText(
          dto?.requirement,
          'requirement',
        ),
        quantity_checked: quantityChecked,
        quantity_passed: quantityPassed,
        checked_by_id: this.normalizeUserId(user),
      },
      include: secondaryPackagingCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderSecondaryPackagingCheckDto,
  ) {
    const existingCheck = await this.findById(checkId);
    const data = this.normalizeUpdateData(
      dto,
      existingCheck.quantity_checked,
      existingCheck.quantity_passed,
    );

    return this.prismaService.productionOrderSecondaryPackagingChecks.update({
      where: { id: checkId },
      data,
      include: secondaryPackagingCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderSecondaryPackagingChecks.delete({
      where: { id: checkId },
      include: secondaryPackagingCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSecondaryPackagingCheckDto,
    existingQuantityChecked: number,
    existingQuantityPassed: number,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSecondaryPackagingChecksUpdateInput = {};
    const hasQuantityChecked = 'quantity_checked' in updateDto;
    const hasQuantityPassed = 'quantity_passed' in updateDto;

    if ('stage' in updateDto) {
      data.stage = this.normalizeRequiredString(updateDto.stage, 'stage', 100);
    }

    if ('requirement' in updateDto) {
      data.requirement = this.normalizeRequiredText(
        updateDto.requirement,
        'requirement',
      );
    }

    const quantityChecked = hasQuantityChecked
      ? this.normalizeQuantity(
          updateDto.quantity_checked,
          'quantity_checked',
          true,
        )
      : existingQuantityChecked;
    const quantityPassed = hasQuantityPassed
      ? this.normalizeQuantity(
          updateDto.quantity_passed,
          'quantity_passed',
          false,
        )
      : existingQuantityPassed;

    if (hasQuantityChecked || hasQuantityPassed) {
      this.ensurePassedQuantityIsValid(quantityChecked, quantityPassed);
      if (hasQuantityChecked) {
        data.quantity_checked = quantityChecked;
      }
      if (hasQuantityPassed) {
        data.quantity_passed = quantityPassed;
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
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const normalizedValue = this.normalizeRequiredText(value, fieldName);
    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }
    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalizedValue;
  }

  private normalizeQuantity(
    value: unknown,
    fieldName: string,
    mustBePositive: boolean,
  ) {
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = Number(value);
    if (!Number.isSafeInteger(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (mustBePositive ? normalizedValue <= 0 : normalizedValue < 0) {
      throw new BadRequestException(
        mustBePositive
          ? `${fieldName} must be greater than 0`
          : `${fieldName} must be greater than or equal to 0`,
      );
    }

    return normalizedValue;
  }

  private ensurePassedQuantityIsValid(
    quantityChecked: number,
    quantityPassed: number,
  ) {
    if (quantityPassed > quantityChecked) {
      throw new BadRequestException(
        'quantity_passed must be less than or equal to quantity_checked',
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
