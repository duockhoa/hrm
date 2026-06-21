import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderBottleVolumeCheckDto } from './dto/create-production-order-bottle-volume-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const VOLUME_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const VOLUME_INTEGER_DIGITS = 8;
const VOLUME_UNIT = 'ml';

const bottleVolumeCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const bottleVolumeCheckInclude = {
  createdBy: {
    select: bottleVolumeCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderBottleVolumeChecksInclude;

@Injectable()
export class ProductionOrderBottleVolumeChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const bottleVolumeCheck =
      await this.prismaService.productionOrderBottleVolumeChecks.findUnique({
        where: {
          id: checkId,
        },
        include: bottleVolumeCheckInclude,
      });

    if (!bottleVolumeCheck) {
      throw new NotFoundException('Bottle volume check not found');
    }

    return bottleVolumeCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderBottleVolumeChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: bottleVolumeCheckInclude,
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
    dto: CreateProductionOrderBottleVolumeCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const volumes = {
      bottle_1_volume: this.normalizeOptionalVolume(
        dto?.bottle_1_volume,
        'bottle_1_volume',
      ),
      bottle_2_volume: this.normalizeOptionalVolume(
        dto?.bottle_2_volume,
        'bottle_2_volume',
      ),
      bottle_3_volume: this.normalizeOptionalVolume(
        dto?.bottle_3_volume,
        'bottle_3_volume',
      ),
      bottle_4_volume: this.normalizeOptionalVolume(
        dto?.bottle_4_volume,
        'bottle_4_volume',
      ),
      bottle_5_volume: this.normalizeOptionalVolume(
        dto?.bottle_5_volume,
        'bottle_5_volume',
      ),
      bottle_6_volume: this.normalizeOptionalVolume(
        dto?.bottle_6_volume,
        'bottle_6_volume',
      ),
    };

    if (Object.values(volumes).every((volume) => volume === null)) {
      throw new BadRequestException('At least one bottle volume is required');
    }

    return this.prismaService.productionOrderBottleVolumeChecks.create({
      data: {
        production_order_id: productionOrderId,
        ...volumes,
        unit: VOLUME_UNIT,
        created_by_id: this.normalizeUserId(user),
      },
      include: bottleVolumeCheckInclude,
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

  private normalizeOptionalVolume(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

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
