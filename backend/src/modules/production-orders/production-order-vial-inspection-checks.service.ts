import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderVialInspectionCheckDto } from './dto/create-production-order-vial-inspection-check.dto';
import { UpdateProductionOrderVialInspectionCheckDto } from './dto/update-production-order-vial-inspection-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const vialInspectionCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const vialInspectionCheckInclude = {
  createdBy: {
    select: vialInspectionCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderVialInspectionChecksInclude;

@Injectable()
export class ProductionOrderVialInspectionChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderVialInspectionChecks.findUnique({
        where: { id: checkId },
        include: vialInspectionCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Vial inspection check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderVialInspectionChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: vialInspectionCheckInclude,
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
    dto: CreateProductionOrderVialInspectionCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderVialInspectionChecks.create({
      data: {
        production_order_id: productionOrderId,
        bag_number: this.normalizeRequiredBagNumber(dto?.bag_number),
        fiber_vial_count: this.normalizeRequiredNonNegativeInt(
          dto?.fiber_vial_count,
          'fiber_vial_count',
        ),
        particulate_count: this.normalizeRequiredNonNegativeInt(
          dto?.particulate_count,
          'particulate_count',
        ),
        damaged_count: this.normalizeRequiredNonNegativeInt(
          dto?.damaged_count,
          'damaged_count',
        ),
        other_defect_count: this.normalizeRequiredNonNegativeInt(
          dto?.other_defect_count,
          'other_defect_count',
        ),
        note: this.normalizeOptionalLongText(dto?.note, 'note'),
        created_by_id: this.normalizeUserId(user),
      },
      include: vialInspectionCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderVialInspectionCheckDto,
  ) {
    await this.findById(checkId);

    return this.prismaService.productionOrderVialInspectionChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: vialInspectionCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderVialInspectionChecks.delete({
      where: { id: checkId },
      include: vialInspectionCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderVialInspectionCheckDto,
  ) {
    const updateDto = dto ?? {};
    const hasBagNumber = 'bag_number' in updateDto;
    const hasFiberVialCount = 'fiber_vial_count' in updateDto;
    const hasParticulateCount = 'particulate_count' in updateDto;
    const hasDamagedCount = 'damaged_count' in updateDto;
    const hasOtherDefectCount = 'other_defect_count' in updateDto;
    const hasNote = 'note' in updateDto;

    if (
      !hasBagNumber &&
      !hasFiberVialCount &&
      !hasParticulateCount &&
      !hasDamagedCount &&
      !hasOtherDefectCount &&
      !hasNote
    ) {
      throw new BadRequestException('At least one field is required');
    }

    const data: Prisma.ProductionOrderVialInspectionChecksUpdateInput = {};

    if (hasBagNumber) {
      data.bag_number = this.normalizeRequiredBagNumber(updateDto.bag_number);
    }

    if (hasFiberVialCount) {
      data.fiber_vial_count = this.normalizeRequiredNonNegativeInt(
        updateDto.fiber_vial_count,
        'fiber_vial_count',
      );
    }

    if (hasParticulateCount) {
      data.particulate_count = this.normalizeRequiredNonNegativeInt(
        updateDto.particulate_count,
        'particulate_count',
      );
    }

    if (hasDamagedCount) {
      data.damaged_count = this.normalizeRequiredNonNegativeInt(
        updateDto.damaged_count,
        'damaged_count',
      );
    }

    if (hasOtherDefectCount) {
      data.other_defect_count = this.normalizeRequiredNonNegativeInt(
        updateDto.other_defect_count,
        'other_defect_count',
      );
    }

    if (hasNote) {
      data.note = this.normalizeOptionalLongText(updateDto.note, 'note');
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

  private normalizeRequiredBagNumber(value: unknown) {
    const bagNumber = this.normalizeRequiredNonNegativeInt(value, 'bag_number');

    if (bagNumber <= 0) {
      throw new BadRequestException('bag_number must be greater than 0');
    }

    return bagNumber;
  }

  private normalizeRequiredNonNegativeInt(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'string' ? value.trim() : String(value);

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    const intValue = Number(normalizedValue);

    if (!Number.isSafeInteger(intValue)) {
      throw new BadRequestException(`${fieldName} must be a safe integer`);
    }

    return intValue;
  }

  private normalizeOptionalLongText(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    return value.trim();
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
