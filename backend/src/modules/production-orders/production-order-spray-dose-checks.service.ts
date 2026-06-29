import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSprayDoseCheckDto } from './dto/create-production-order-spray-dose-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const SPRAY_DOSE_UNIT = 'dose';

const sprayDoseCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const sprayDoseCheckInclude = {
  createdBy: {
    select: sprayDoseCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderSprayDoseChecksInclude;

@Injectable()
export class ProductionOrderSprayDoseChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const sprayDoseCheck =
      await this.prismaService.productionOrderSprayDoseChecks.findUnique({
        where: {
          id: checkId,
        },
        include: sprayDoseCheckInclude,
      });

    if (!sprayDoseCheck) {
      throw new NotFoundException('Spray dose check not found');
    }

    return sprayDoseCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSprayDoseChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: sprayDoseCheckInclude,
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
    dto: CreateProductionOrderSprayDoseCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSprayDoseChecks.create({
      data: {
        production_order_id: productionOrderId,
        bottle_1_spray_dose_count: this.normalizeRequiredPositiveInt(
          dto?.bottle_1_spray_dose_count,
          'bottle_1_spray_dose_count',
        ),
        bottle_2_spray_dose_count: this.normalizeRequiredPositiveInt(
          dto?.bottle_2_spray_dose_count,
          'bottle_2_spray_dose_count',
        ),
        bottle_3_spray_dose_count: this.normalizeRequiredPositiveInt(
          dto?.bottle_3_spray_dose_count,
          'bottle_3_spray_dose_count',
        ),
        bottle_4_spray_dose_count: this.normalizeRequiredPositiveInt(
          dto?.bottle_4_spray_dose_count,
          'bottle_4_spray_dose_count',
        ),
        unit: SPRAY_DOSE_UNIT,
        created_by_id: this.normalizeUserId(user),
      },
      include: sprayDoseCheckInclude,
    });
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

  private normalizeRequiredPositiveInt(value: unknown, fieldName: string) {
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
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    const intValue = Number(normalizedValue);

    if (!Number.isSafeInteger(intValue)) {
      throw new BadRequestException(`${fieldName} must be a safe integer`);
    }

    if (intValue <= 0) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return intValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
