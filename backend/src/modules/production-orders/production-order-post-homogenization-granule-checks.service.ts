import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderPostHomogenizationGranuleCheckDto } from './dto/create-production-order-post-homogenization-granule-check.dto';
import { UpdateProductionOrderPostHomogenizationGranuleCheckDto } from './dto/update-production-order-post-homogenization-granule-check.dto';
import {
  getPostHomogenizationGranuleCheckImageLookupPaths,
  removePostHomogenizationGranuleCheckImageByPath,
  resolvePostHomogenizationGranuleCheckImageFile,
} from './production-order-post-homogenization-granule-check-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

const DENSITY_UNIT = 'g/ml';
const DENSITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,6})?$/;
const DENSITY_INTEGER_DIGITS = 6;

const postHomogenizationGranuleCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const postHomogenizationGranuleCheckInclude = {
  createdBy: {
    select: postHomogenizationGranuleCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderPostHomogenizationGranuleChecksInclude;

const postHomogenizationGranuleCheckValueSelect = {
  id: true,
  bulk_density: true,
  tapped_density: true,
  image_path: true,
} satisfies Prisma.ProductionOrderPostHomogenizationGranuleChecksSelect;

type PostHomogenizationGranuleCheckValues =
  Prisma.ProductionOrderPostHomogenizationGranuleChecksGetPayload<{
    select: typeof postHomogenizationGranuleCheckValueSelect;
  }>;

@Injectable()
export class ProductionOrderPostHomogenizationGranuleChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique(
        {
          where: {
            id: checkId,
          },
          include: postHomogenizationGranuleCheckInclude,
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Post-homogenization granule check not found',
      );
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderPostHomogenizationGranuleChecks.findMany(
      {
        where: {
          production_order_id: productionOrderId,
        },
        include: postHomogenizationGranuleCheckInclude,
        orderBy: [
          {
            created_at: 'desc',
          },
          {
            id: 'desc',
          },
        ],
      },
    );
  }

  async findImageFile(filename: string) {
    const imagePaths =
      getPostHomogenizationGranuleCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const check =
      await this.prismaService.productionOrderPostHomogenizationGranuleChecks.findFirst(
        {
          where: {
            image_path: {
              in: imagePaths,
            },
          },
          select: {
            id: true,
          },
        },
      );

    if (!check) {
      return null;
    }

    return resolvePostHomogenizationGranuleCheckImageFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderPostHomogenizationGranuleCheckDto,
    user?: AuthenticatedUser,
    files: {
      imagePath?: string;
    } = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const bulkDensity = this.normalizeRequiredDensity(
      dto?.bulk_density,
      'bulk_density',
    );
    const tappedDensity = this.normalizeRequiredDensity(
      dto?.tapped_density,
      'tapped_density',
    );
    const carrIndex = this.calculateCarrIndex(bulkDensity, tappedDensity);

    return this.prismaService.productionOrderPostHomogenizationGranuleChecks.create(
      {
        data: {
          production_order_id: productionOrderId,
          bulk_density: bulkDensity,
          tapped_density: tappedDensity,
          density_unit: DENSITY_UNIT,
          image_path: files.imagePath ?? null,
          carr_index: carrIndex,
          created_by_id: this.normalizeUserId(user),
        },
        include: postHomogenizationGranuleCheckInclude,
      },
    );
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderPostHomogenizationGranuleCheckDto,
    files: {
      imagePath?: string;
    } = {},
  ) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);
    const data = this.normalizeUpdateData(dto, files, existingCheck);

    const updatedCheck =
      await this.prismaService.productionOrderPostHomogenizationGranuleChecks.update(
        {
          where: { id: checkId },
          data,
          include: postHomogenizationGranuleCheckInclude,
        },
      );

    if (
      files.imagePath &&
      existingCheck.image_path &&
      existingCheck.image_path !== files.imagePath
    ) {
      await removePostHomogenizationGranuleCheckImageByPath(
        existingCheck.image_path,
      );
    }

    return updatedCheck;
  }

  async delete(checkId: number) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);

    const deletedCheck =
      await this.prismaService.productionOrderPostHomogenizationGranuleChecks.delete(
        {
          where: { id: checkId },
          include: postHomogenizationGranuleCheckInclude,
        },
      );

    await removePostHomogenizationGranuleCheckImageByPath(
      existingCheck.image_path,
    );

    return deletedCheck;
  }

  private calculateCarrIndex(
    bulkDensity: Prisma.Decimal,
    tappedDensity: Prisma.Decimal,
  ) {
    if (tappedDensity.lt(bulkDensity)) {
      throw new BadRequestException(
        'tapped_density must be greater than or equal to bulk_density',
      );
    }

    return new Prisma.Decimal(
      tappedDensity.minus(bulkDensity).div(tappedDensity).mul(100).toFixed(4),
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

  private async findValuesByIdOrThrow(checkId: number) {
    const check =
      await this.prismaService.productionOrderPostHomogenizationGranuleChecks.findUnique(
        {
          where: { id: checkId },
          select: postHomogenizationGranuleCheckValueSelect,
        },
      );

    if (!check) {
      throw new NotFoundException(
        'Post-homogenization granule check not found',
      );
    }

    return check;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderPostHomogenizationGranuleCheckDto,
    files: {
      imagePath?: string;
    },
    existingCheck: PostHomogenizationGranuleCheckValues,
  ) {
    const updateDto = dto ?? {};
    const hasBulkDensity = 'bulk_density' in updateDto;
    const hasTappedDensity = 'tapped_density' in updateDto;
    const data: Prisma.ProductionOrderPostHomogenizationGranuleChecksUpdateInput =
      {};

    if (!hasBulkDensity && !hasTappedDensity && !files.imagePath) {
      throw new BadRequestException('At least one field is required');
    }

    const bulkDensity = hasBulkDensity
      ? this.normalizeRequiredDensity(updateDto.bulk_density, 'bulk_density')
      : existingCheck.bulk_density;
    const tappedDensity = hasTappedDensity
      ? this.normalizeRequiredDensity(
          updateDto.tapped_density,
          'tapped_density',
        )
      : existingCheck.tapped_density;

    if (hasBulkDensity) {
      data.bulk_density = bulkDensity;
    }

    if (hasTappedDensity) {
      data.tapped_density = tappedDensity;
    }

    if (hasBulkDensity || hasTappedDensity) {
      data.carr_index = this.calculateCarrIndex(bulkDensity, tappedDensity);
    }

    if (files.imagePath) {
      data.image_path = files.imagePath;
    }

    return data;
  }

  private normalizeRequiredDensity(value: unknown, fieldName: string) {
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
