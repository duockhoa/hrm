import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderVolumeCheckDto } from './dto/create-production-order-volume-check.dto';
import { UpdateProductionOrderVolumeCheckDto } from './dto/update-production-order-volume-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const VOLUME_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const VOLUME_INTEGER_DIGITS = 8;
const VOLUME_UNIT = 'ml';
const MAX_PACKAGE_TYPE_LENGTH = 50;
const MAX_DOSAGE_FORM_STAGE_LENGTH = 50;

const volumeCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const volumeCheckInclude = {
  createdBy: {
    select: volumeCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderVolumeChecksInclude;

const volumeCheckValueSelect = {
  id: true,
  unit_1_volume: true,
  unit_2_volume: true,
  unit_3_volume: true,
  unit_4_volume: true,
  unit_5_volume: true,
  unit_6_volume: true,
} satisfies Prisma.ProductionOrderVolumeChecksSelect;

type VolumeCheckValues = Prisma.ProductionOrderVolumeChecksGetPayload<{
  select: typeof volumeCheckValueSelect;
}>;

type VolumeValues = Pick<
  Prisma.ProductionOrderVolumeChecksCreateInput,
  | 'unit_1_volume'
  | 'unit_2_volume'
  | 'unit_3_volume'
  | 'unit_4_volume'
  | 'unit_5_volume'
  | 'unit_6_volume'
>;

@Injectable()
export class ProductionOrderVolumeChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const volumeCheck =
      await this.prismaService.productionOrderVolumeChecks.findUnique({
        where: {
          id: checkId,
        },
        include: volumeCheckInclude,
      });

    if (!volumeCheck) {
      throw new NotFoundException('Volume check not found');
    }

    return volumeCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderVolumeChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: volumeCheckInclude,
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
    dto: CreateProductionOrderVolumeCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const volumes = this.normalizeVolumeValues(dto);

    return this.prismaService.productionOrderVolumeChecks.create({
      data: {
        production_order_id: productionOrderId,
        package_type: this.normalizeOptionalPackageType(dto?.package_type),
        requirement: this.normalizeOptionalLongText(
          dto?.requirement,
          'requirement',
        ),
        dosage_form_stage: this.normalizeOptionalDosageFormStage(
          dto?.dosage_form_stage,
        ),
        ...volumes,
        unit: VOLUME_UNIT,
        created_by_id: this.normalizeUserId(user),
      },
      include: volumeCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderVolumeCheckDto) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);

    return this.prismaService.productionOrderVolumeChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto, existingCheck),
      include: volumeCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findValuesByIdOrThrow(checkId);

    return this.prismaService.productionOrderVolumeChecks.delete({
      where: { id: checkId },
      include: volumeCheckInclude,
    });
  }

  private async findValuesByIdOrThrow(checkId: number) {
    const volumeCheck =
      await this.prismaService.productionOrderVolumeChecks.findUnique({
        where: {
          id: checkId,
        },
        select: volumeCheckValueSelect,
      });

    if (!volumeCheck) {
      throw new NotFoundException('Volume check not found');
    }

    return volumeCheck;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderVolumeCheckDto,
    existingCheck: VolumeCheckValues,
  ) {
    const updateDto = dto ?? {};
    const hasPackageType = 'package_type' in updateDto;
    const hasRequirement = 'requirement' in updateDto;
    const hasDosageFormStage = 'dosage_form_stage' in updateDto;
    const hasUnit1Volume = 'unit_1_volume' in updateDto;
    const hasUnit2Volume = 'unit_2_volume' in updateDto;
    const hasUnit3Volume = 'unit_3_volume' in updateDto;
    const hasUnit4Volume = 'unit_4_volume' in updateDto;
    const hasUnit5Volume = 'unit_5_volume' in updateDto;
    const hasUnit6Volume = 'unit_6_volume' in updateDto;

    if (
      !hasPackageType &&
      !hasRequirement &&
      !hasDosageFormStage &&
      !hasUnit1Volume &&
      !hasUnit2Volume &&
      !hasUnit3Volume &&
      !hasUnit4Volume &&
      !hasUnit5Volume &&
      !hasUnit6Volume
    ) {
      throw new BadRequestException('At least one field is required');
    }

    const data: Prisma.ProductionOrderVolumeChecksUpdateInput = {};

    if (hasPackageType) {
      data.package_type = this.normalizeOptionalPackageType(
        updateDto.package_type,
      );
    }

    if (hasRequirement) {
      data.requirement = this.normalizeOptionalLongText(
        updateDto.requirement,
        'requirement',
      );
    }

    if (hasDosageFormStage) {
      data.dosage_form_stage = this.normalizeOptionalDosageFormStage(
        updateDto.dosage_form_stage,
      );
    }

    const finalVolumes = {
      unit_1_volume: hasUnit1Volume
        ? this.normalizeRequiredVolume(updateDto.unit_1_volume, 'unit_1_volume')
        : existingCheck.unit_1_volume,
      unit_2_volume: hasUnit2Volume
        ? this.normalizeOptionalVolume(updateDto.unit_2_volume, 'unit_2_volume')
        : existingCheck.unit_2_volume,
      unit_3_volume: hasUnit3Volume
        ? this.normalizeOptionalVolume(updateDto.unit_3_volume, 'unit_3_volume')
        : existingCheck.unit_3_volume,
      unit_4_volume: hasUnit4Volume
        ? this.normalizeOptionalVolume(updateDto.unit_4_volume, 'unit_4_volume')
        : existingCheck.unit_4_volume,
      unit_5_volume: hasUnit5Volume
        ? this.normalizeOptionalVolume(updateDto.unit_5_volume, 'unit_5_volume')
        : existingCheck.unit_5_volume,
      unit_6_volume: hasUnit6Volume
        ? this.normalizeOptionalVolume(updateDto.unit_6_volume, 'unit_6_volume')
        : existingCheck.unit_6_volume,
    };

    if (hasUnit1Volume) {
      data.unit_1_volume = finalVolumes.unit_1_volume;
    }

    if (hasUnit2Volume) {
      data.unit_2_volume = finalVolumes.unit_2_volume;
    }

    if (hasUnit3Volume) {
      data.unit_3_volume = finalVolumes.unit_3_volume;
    }

    if (hasUnit4Volume) {
      data.unit_4_volume = finalVolumes.unit_4_volume;
    }

    if (hasUnit5Volume) {
      data.unit_5_volume = finalVolumes.unit_5_volume;
    }

    if (hasUnit6Volume) {
      data.unit_6_volume = finalVolumes.unit_6_volume;
    }

    return data;
  }

  private normalizeVolumeValues(
    dto:
      | CreateProductionOrderVolumeCheckDto
      | UpdateProductionOrderVolumeCheckDto,
  ): VolumeValues {
    return {
      unit_1_volume: this.normalizeRequiredVolume(
        dto?.unit_1_volume,
        'unit_1_volume',
      ),
      unit_2_volume: this.normalizeOptionalVolume(
        dto?.unit_2_volume,
        'unit_2_volume',
      ),
      unit_3_volume: this.normalizeOptionalVolume(
        dto?.unit_3_volume,
        'unit_3_volume',
      ),
      unit_4_volume: this.normalizeOptionalVolume(
        dto?.unit_4_volume,
        'unit_4_volume',
      ),
      unit_5_volume: this.normalizeOptionalVolume(
        dto?.unit_5_volume,
        'unit_5_volume',
      ),
      unit_6_volume: this.normalizeOptionalVolume(
        dto?.unit_6_volume,
        'unit_6_volume',
      ),
    };
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

  private normalizeOptionalPackageType(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('package_type must be a string');
    }

    const packageType = value.trim();

    if (packageType.length > MAX_PACKAGE_TYPE_LENGTH) {
      throw new BadRequestException(
        `package_type must be at most ${MAX_PACKAGE_TYPE_LENGTH} characters`,
      );
    }

    return packageType;
  }

  private normalizeOptionalDosageFormStage(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
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

  private normalizeRequiredVolume(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.normalizeVolume(value, fieldName);
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

  private normalizeOptionalVolume(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    return this.normalizeVolume(value, fieldName);
  }

  private normalizeVolume(value: unknown, fieldName: string) {
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

    if (!VOLUME_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(10, 2) with up to 2 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > VOLUME_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(10, 2)`);
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
