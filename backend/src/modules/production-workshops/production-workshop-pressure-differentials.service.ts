import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionWorkshopPressureDifferentialDto } from './dto/create-production-workshop-pressure-differential.dto';
import { UpdateProductionWorkshopPressureDifferentialDto } from './dto/update-production-workshop-pressure-differential.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const PRESSURE_DIFFERENTIAL_UNIT = 'Pa';
const INTEGER_MIN = -2147483648;
const INTEGER_MAX = 2147483647;

const pressureDifferentialUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const pressureDifferentialInclude = {
  workshop: true,
  createdBy: {
    select: pressureDifferentialUserSelect,
  },
} satisfies Prisma.ProductionWorkshopPressureDifferentialsInclude;

@Injectable()
export class ProductionWorkshopPressureDifferentialsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(pressureDifferentialId: number) {
    const pressureDifferential =
      await this.prismaService.productionWorkshopPressureDifferentials.findUnique(
        {
          where: {
            id: pressureDifferentialId,
          },
          include: pressureDifferentialInclude,
        },
      );

    if (!pressureDifferential) {
      throw new NotFoundException('Pressure differential not found');
    }

    return pressureDifferential;
  }

  async findAllByProductionWorkshop(workshopId: number) {
    await this.ensureProductionWorkshopExists(workshopId);

    return this.prismaService.productionWorkshopPressureDifferentials.findMany({
      where: {
        workshop_id: workshopId,
      },
      include: pressureDifferentialInclude,
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
    workshopId: number,
    dto: CreateProductionWorkshopPressureDifferentialDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionWorkshopExists(workshopId);

    return this.prismaService.productionWorkshopPressureDifferentials.create({
      data: {
        workshop_id: workshopId,
        gauge_name: this.normalizeRequiredString(dto?.gauge_name, 'gauge_name'),
        differential_pressure: this.normalizeRequiredInteger(
          dto?.differential_pressure,
          'differential_pressure',
        ),
        unit: PRESSURE_DIFFERENTIAL_UNIT,
        conclusion: this.normalizeRequiredString(
          dto?.conclusion,
          'conclusion',
          50,
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: pressureDifferentialInclude,
    });
  }

  async update(
    pressureDifferentialId: number,
    dto: UpdateProductionWorkshopPressureDifferentialDto,
  ) {
    await this.findById(pressureDifferentialId);

    const data: Prisma.ProductionWorkshopPressureDifferentialsUncheckedUpdateInput =
      {};

    if (dto.gauge_name !== undefined) {
      data.gauge_name = this.normalizeRequiredString(
        dto.gauge_name,
        'gauge_name',
      );
    }

    if (dto.differential_pressure !== undefined) {
      data.differential_pressure = this.normalizeRequiredInteger(
        dto.differential_pressure,
        'differential_pressure',
      );
    }

    if (dto.conclusion !== undefined) {
      data.conclusion = this.normalizeRequiredString(
        dto.conclusion,
        'conclusion',
        50,
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return this.prismaService.productionWorkshopPressureDifferentials.update({
      where: {
        id: pressureDifferentialId,
      },
      data,
      include: pressureDifferentialInclude,
    });
  }

  async delete(pressureDifferentialId: number) {
    const pressureDifferential = await this.findById(pressureDifferentialId);

    await this.prismaService.productionWorkshopPressureDifferentials.delete({
      where: {
        id: pressureDifferentialId,
      },
    });

    return pressureDifferential;
  }

  private async ensureProductionWorkshopExists(workshopId: number) {
    const productionWorkshop =
      await this.prismaService.productionWorkshops.findUnique({
        where: {
          id: workshopId,
        },
        select: {
          id: true,
        },
      });

    if (!productionWorkshop) {
      throw new NotFoundException('Production workshop not found');
    }
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength = 191,
  ) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredInteger(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    let normalizedValue: number;

    if (typeof value === 'number') {
      normalizedValue = value;
    } else if (typeof value === 'string') {
      const trimmedValue = value.trim();

      if (!/^-?\d+$/.test(trimmedValue)) {
        throw new BadRequestException(`${fieldName} must be an integer`);
      }

      normalizedValue = Number(trimmedValue);
    } else {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (
      !Number.isInteger(normalizedValue) ||
      normalizedValue < INTEGER_MIN ||
      normalizedValue > INTEGER_MAX
    ) {
      throw new BadRequestException(`${fieldName} must be an integer`);
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
