import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderEnvironmentCheckDto } from './dto/create-production-order-environment-check.dto';
import { UpdateProductionOrderEnvironmentCheckDto } from './dto/update-production-order-environment-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const DECIMAL_5_2_PATTERN = /^-?\d{1,3}(\.\d{1,2})?$/;

const environmentCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const environmentCheckInclude = {
  createdBy: {
    select: environmentCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderEnvironmentChecksInclude;

@Injectable()
export class ProductionOrderEnvironmentChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const environmentCheck =
      await this.prismaService.productionOrderEnvironmentChecks.findUnique({
        where: {
          id: checkId,
        },
        include: environmentCheckInclude,
      });

    if (!environmentCheck) {
      throw new NotFoundException('Environment check not found');
    }

    return environmentCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderEnvironmentChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: environmentCheckInclude,
      orderBy: [
        {
          checked_at: 'desc',
        },
        {
          created_at: 'desc',
        },
      ],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderEnvironmentCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderEnvironmentChecks.create({
      data: {
        production_order_id: productionOrderId,
        room: this.normalizeRequiredString(dto?.room, 'room'),
        temperature_c: this.normalizeRequiredDecimal(
          dto?.temperature_c,
          'temperature_c',
        ),
        humidity_percent: this.normalizeRequiredDecimal(
          dto?.humidity_percent,
          'humidity_percent',
          {
            min: 0,
            max: 100,
          },
        ),
        created_by_id: this.normalizeUserId(user),
        checked_at: this.normalizeRequiredDate(dto?.checked_at, 'checked_at'),
      },
      include: environmentCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderEnvironmentCheckDto,
  ) {
    await this.findById(checkId);

    return this.prismaService.productionOrderEnvironmentChecks.update({
      where: { id: checkId },
      data: this.normalizeUpdateData(dto),
      include: environmentCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderEnvironmentChecks.delete({
      where: { id: checkId },
      include: environmentCheckInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateProductionOrderEnvironmentCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderEnvironmentChecksUpdateInput = {};

    if ('room' in updateDto) {
      data.room = this.normalizeRequiredString(updateDto.room, 'room');
    }

    if ('temperature_c' in updateDto) {
      data.temperature_c = this.normalizeRequiredDecimal(
        updateDto.temperature_c,
        'temperature_c',
      );
    }

    if ('humidity_percent' in updateDto) {
      data.humidity_percent = this.normalizeRequiredDecimal(
        updateDto.humidity_percent,
        'humidity_percent',
        {
          min: 0,
          max: 100,
        },
      );
    }

    if ('checked_at' in updateDto) {
      data.checked_at = this.normalizeRequiredDate(
        updateDto.checked_at,
        'checked_at',
      );
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

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeRequiredDecimal(
    value: unknown,
    fieldName: string,
    options: {
      min?: number;
      max?: number;
    } = {},
  ) {
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

    if (!DECIMAL_5_2_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(5, 2) with up to 2 decimal places`,
      );
    }

    const numberValue = Number(normalizedValue);

    if (!Number.isFinite(numberValue)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    if (options.min !== undefined && numberValue < options.min) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${options.min}`,
      );
    }

    if (options.max !== undefined && numberValue > options.max) {
      throw new BadRequestException(
        `${fieldName} must be less than or equal to ${options.max}`,
      );
    }

    return new Prisma.Decimal(normalizedValue);
  }

  private normalizeRequiredDate(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException(`${fieldName} must be a valid date`);
      }

      return value;
    }

    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
