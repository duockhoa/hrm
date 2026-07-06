import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSteamSterilizationCheckDto } from './dto/create-production-order-steam-sterilization-check.dto';
import { UpdateProductionOrderSteamSterilizationCheckDto } from './dto/update-production-order-steam-sterilization-check.dto';
import {
  getSteamSterilizationCheckImageLookupPaths,
  removeStoredSteamSterilizationCheckImages,
  resolveSteamSterilizationCheckImageFile,
} from './production-order-steam-sterilization-check-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

type SteamSterilizationCheckFiles = {
  configurationImagePath?: string;
  indicatorImagePath?: string;
  reachedTemperatureImagePath?: string;
};

const TEMPERATURE_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const TEMPERATURE_INTEGER_DIGITS = 6;
const TEXT_MAX_LENGTH = 255;

const steamSterilizationCheckUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const steamSterilizationCheckInclude = {
  createdBy: {
    select: steamSterilizationCheckUserSelect,
  },
  checkedBy: {
    select: steamSterilizationCheckUserSelect,
  },
} satisfies Prisma.ProductionOrderSteamSterilizationChecksInclude;

@Injectable()
export class ProductionOrderSteamSterilizationChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderSteamSterilizationChecks.findUnique(
        {
          where: {
            id: checkId,
          },
          include: steamSterilizationCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException('Steam sterilization check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSteamSterilizationChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: steamSterilizationCheckInclude,
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

  async findImageFile(filename: string) {
    const imagePaths = getSteamSterilizationCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const check =
      await this.prismaService.productionOrderSteamSterilizationChecks.findFirst(
        {
          where: {
            OR: [
              {
                configuration_image_path: {
                  in: imagePaths,
                },
              },
              {
                indicator_image_path: {
                  in: imagePaths,
                },
              },
              {
                reached_temperature_image_path: {
                  in: imagePaths,
                },
              },
            ],
          },
          select: {
            id: true,
          },
        },
      );

    if (!check) {
      return null;
    }

    return resolveSteamSterilizationCheckImageFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSteamSterilizationCheckDto,
    user?: AuthenticatedUser,
    files: SteamSterilizationCheckFiles = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const checkedById = await this.normalizeOptionalUserId(
      dto?.checked_by_id,
      'checked_by_id',
    );

    return this.prismaService.productionOrderSteamSterilizationChecks.create({
      data: {
        production_order_id: productionOrderId,
        equipment_name: this.normalizeOptionalString(
          dto?.equipment_name,
          'equipment_name',
          TEXT_MAX_LENGTH,
        ),
        setting_temperature: this.normalizeOptionalTemperature(
          dto?.setting_temperature,
          'setting_temperature',
        ),
        setting_time: this.normalizeOptionalPositiveInteger(
          dto?.setting_time,
          'setting_time',
        ),
        configuration_image_path: files.configurationImagePath ?? null,
        indicator_image_path: files.indicatorImagePath ?? null,
        reached_temperature_image_path:
          files.reachedTemperatureImagePath ?? null,
        created_by_id: this.normalizeUserId(user),
        checked_by_id: checkedById,
        checked_at: this.normalizeOptionalDate(dto?.checked_at, 'checked_at'),
      },
      include: steamSterilizationCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderSteamSterilizationCheckDto,
    files: SteamSterilizationCheckFiles = {},
  ) {
    const existingCheck = await this.findById(checkId);
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSteamSterilizationChecksUncheckedUpdateInput =
      {};

    if ('equipment_name' in updateDto) {
      data.equipment_name = this.normalizeOptionalString(
        updateDto.equipment_name,
        'equipment_name',
        TEXT_MAX_LENGTH,
      );
    }

    if ('setting_temperature' in updateDto) {
      data.setting_temperature = this.normalizeOptionalTemperature(
        updateDto.setting_temperature,
        'setting_temperature',
      );
    }

    if ('setting_time' in updateDto) {
      data.setting_time = this.normalizeOptionalPositiveInteger(
        updateDto.setting_time,
        'setting_time',
      );
    }

    if ('checked_by_id' in updateDto) {
      data.checked_by_id = await this.normalizeOptionalUserId(
        updateDto.checked_by_id,
        'checked_by_id',
      );
    }

    if ('checked_at' in updateDto) {
      data.checked_at = this.normalizeOptionalDate(
        updateDto.checked_at,
        'checked_at',
      );
    }

    if (files.configurationImagePath !== undefined) {
      data.configuration_image_path = files.configurationImagePath;
    }

    if (files.indicatorImagePath !== undefined) {
      data.indicator_image_path = files.indicatorImagePath;
    }

    if (files.reachedTemperatureImagePath !== undefined) {
      data.reached_temperature_image_path = files.reachedTemperatureImagePath;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    const updatedCheck =
      await this.prismaService.productionOrderSteamSterilizationChecks.update({
        where: {
          id: checkId,
        },
        data,
        include: steamSterilizationCheckInclude,
      });

    await removeStoredSteamSterilizationCheckImages([
      files.configurationImagePath !== undefined
        ? existingCheck.configuration_image_path
        : null,
      files.indicatorImagePath !== undefined
        ? existingCheck.indicator_image_path
        : null,
      files.reachedTemperatureImagePath !== undefined
        ? existingCheck.reached_temperature_image_path
        : null,
    ]);

    return updatedCheck;
  }

  async delete(checkId: number) {
    const existingCheck = await this.findById(checkId);

    await this.prismaService.productionOrderSteamSterilizationChecks.delete({
      where: {
        id: checkId,
      },
    });

    await removeStoredSteamSterilizationCheckImages([
      existingCheck.configuration_image_path,
      existingCheck.indicator_image_path,
      existingCheck.reached_temperature_image_path,
    ]);

    return existingCheck;
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

  private async ensureUserExists(userId: number) {
    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private normalizeOptionalString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
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

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalTemperature(value: unknown, fieldName: string) {
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

    if (!TEMPERATURE_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(8, 2) with up to 2 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > TEMPERATURE_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(8, 2)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeOptionalPositiveInteger(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue =
      typeof value === 'string' ? value.trim() : String(value);

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    const integerValue = Number(normalizedValue);

    if (!Number.isInteger(integerValue) || integerValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return integerValue;
  }

  private normalizeOptionalDate(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedDate =
      value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return normalizedDate;
  }

  private async normalizeOptionalUserId(value: unknown, fieldName: string) {
    const userId = this.normalizeOptionalPositiveInteger(value, fieldName);

    if (userId !== null) {
      await this.ensureUserExists(userId);
    }

    return userId;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
