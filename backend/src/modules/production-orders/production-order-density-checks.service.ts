import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderDensityCheckDto } from './dto/create-production-order-density-check.dto';
import { UpdateProductionOrderDensityCheckDto } from './dto/update-production-order-density-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const MASS_DECIMAL_PATTERN = /^\d+(?:\.\d{1,4})?$/;
const MASS_INTEGER_DIGITS = 8;
const DENSITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,6})?$/;
const DENSITY_INTEGER_DIGITS = 6;

const densityCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const densityCheckInclude = {
  createdBy: {
    select: densityCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderDensityChecksInclude;

const densityCheckMassSelect = {
  id: true,
  empty_pycnometer_mass_g: true,
  solution_pycnometer_mass_g: true,
  water_pycnometer_mass_g: true,
} satisfies Prisma.ProductionOrderDensityChecksSelect;

type DensityCheckMasses = Prisma.ProductionOrderDensityChecksGetPayload<{
  select: typeof densityCheckMassSelect;
}>;

@Injectable()
export class ProductionOrderDensityChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const densityCheck =
      await this.prismaService.productionOrderDensityChecks.findUnique({
        where: {
          id: checkId,
        },
        include: densityCheckInclude,
      });

    if (!densityCheck) {
      throw new NotFoundException('Density check not found');
    }

    return densityCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDensityChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: densityCheckInclude,
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
    dto: CreateProductionOrderDensityCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const emptyPycnometerMass = this.normalizeRequiredMass(
      dto?.empty_pycnometer_mass_g,
      'empty_pycnometer_mass_g',
    );
    const solutionPycnometerMass = this.normalizeRequiredMass(
      dto?.solution_pycnometer_mass_g,
      'solution_pycnometer_mass_g',
    );
    const waterPycnometerMass = this.normalizeRequiredMass(
      dto?.water_pycnometer_mass_g,
      'water_pycnometer_mass_g',
    );
    const density = this.calculateDensity(
      emptyPycnometerMass,
      solutionPycnometerMass,
      waterPycnometerMass,
    );

    return this.prismaService.productionOrderDensityChecks.create({
      data: {
        production_order_id: productionOrderId,
        empty_pycnometer_mass_g: emptyPycnometerMass,
        solution_pycnometer_mass_g: solutionPycnometerMass,
        water_pycnometer_mass_g: waterPycnometerMass,
        density,
        apparent_density: this.normalizeOptionalDensity(
          dto?.apparent_density,
          'apparent_density',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: densityCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderDensityCheckDto) {
    const existingCheck = await this.findMassesByIdOrThrow(checkId);

    return this.prismaService.productionOrderDensityChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto, existingCheck),
      include: densityCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findMassesByIdOrThrow(checkId);

    return this.prismaService.productionOrderDensityChecks.delete({
      where: { id: checkId },
      include: densityCheckInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderDensityCheckDto,
    existingCheck: DensityCheckMasses,
  ) {
    const updateDto = dto ?? {};
    const hasEmptyMass = 'empty_pycnometer_mass_g' in updateDto;
    const hasSolutionMass = 'solution_pycnometer_mass_g' in updateDto;
    const hasWaterMass = 'water_pycnometer_mass_g' in updateDto;
    const hasApparentDensity = 'apparent_density' in updateDto;

    if (
      !hasEmptyMass &&
      !hasSolutionMass &&
      !hasWaterMass &&
      !hasApparentDensity
    ) {
      throw new BadRequestException('At least one field is required');
    }

    const emptyPycnometerMass = hasEmptyMass
      ? this.normalizeRequiredMass(
          updateDto.empty_pycnometer_mass_g,
          'empty_pycnometer_mass_g',
        )
      : existingCheck.empty_pycnometer_mass_g;
    const solutionPycnometerMass = hasSolutionMass
      ? this.normalizeRequiredMass(
          updateDto.solution_pycnometer_mass_g,
          'solution_pycnometer_mass_g',
        )
      : existingCheck.solution_pycnometer_mass_g;
    const waterPycnometerMass = hasWaterMass
      ? this.normalizeRequiredMass(
          updateDto.water_pycnometer_mass_g,
          'water_pycnometer_mass_g',
        )
      : existingCheck.water_pycnometer_mass_g;
    const data: Prisma.ProductionOrderDensityChecksUpdateInput = {};

    if (hasEmptyMass || hasSolutionMass || hasWaterMass) {
      data.density = this.calculateDensity(
        emptyPycnometerMass,
        solutionPycnometerMass,
        waterPycnometerMass,
      );
    }

    if (hasEmptyMass) {
      data.empty_pycnometer_mass_g = emptyPycnometerMass;
    }

    if (hasSolutionMass) {
      data.solution_pycnometer_mass_g = solutionPycnometerMass;
    }

    if (hasWaterMass) {
      data.water_pycnometer_mass_g = waterPycnometerMass;
    }

    if (hasApparentDensity) {
      data.apparent_density = this.normalizeOptionalDensity(
        updateDto.apparent_density,
        'apparent_density',
      );
    }

    return data;
  }

  private calculateDensity(
    emptyPycnometerMass: Prisma.Decimal,
    solutionPycnometerMass: Prisma.Decimal,
    waterPycnometerMass: Prisma.Decimal,
  ) {
    const solutionNetMass = solutionPycnometerMass.minus(emptyPycnometerMass);
    const waterNetMass = waterPycnometerMass.minus(emptyPycnometerMass);

    if (solutionNetMass.lte(0)) {
      throw new BadRequestException(
        'solution_pycnometer_mass_g must be greater than empty_pycnometer_mass_g',
      );
    }

    if (waterNetMass.lte(0)) {
      throw new BadRequestException(
        'water_pycnometer_mass_g must be greater than empty_pycnometer_mass_g',
      );
    }

    return new Prisma.Decimal(solutionNetMass.div(waterNetMass).toFixed(6));
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

  private async findMassesByIdOrThrow(checkId: number) {
    const densityCheck =
      await this.prismaService.productionOrderDensityChecks.findUnique({
        where: { id: checkId },
        select: densityCheckMassSelect,
      });

    if (!densityCheck) {
      throw new NotFoundException('Density check not found');
    }

    return densityCheck;
  }

  private normalizeRequiredMass(value: unknown, fieldName: string) {
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

    if (!MASS_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 4) with up to 4 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > MASS_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 4)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeOptionalDensity(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : String(value).trim().replace(',', '.');

    if (!DENSITY_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 6) with up to 6 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > DENSITY_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 6)`);
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
