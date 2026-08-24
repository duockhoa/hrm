import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderPreSecondaryPackagingCheckDto } from './dto/create-production-order-pre-secondary-packaging-check.dto';
import { UpdateProductionOrderPreSecondaryPackagingCheckDto } from './dto/update-production-order-pre-secondary-packaging-check.dto';
import {
  getPreSecondaryPackagingCheckImageLookupPaths,
  MAX_PRE_SECONDARY_PACKAGING_CHECK_IMAGE_COUNT,
  removePreSecondaryPackagingCheckImagesByPath,
  resolvePreSecondaryPackagingCheckImageFile,
} from './production-order-pre-secondary-packaging-check-upload.config';

type AuthenticatedUser = { id?: number | string | null };

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const checkSelect = {
  id: true,
  production_order_id: true,
  requirement: true,
  quantity_checked: true,
  quantity_passed: true,
  created_by_id: true,
  created_at: true,
  updated_at: true,
  createdBy: { select: creatorSelect },
  images: { orderBy: [{ created_at: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.ProductionOrderPreSecondaryPackagingChecksSelect;

@Injectable()
export class ProductionOrderPreSecondaryPackagingChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderPreSecondaryPackagingChecks.findUnique(
        {
          where: { id: checkId },
          select: checkSelect,
        },
      );
    if (!check)
      throw new NotFoundException('Pre-secondary packaging check not found');
    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);
    return this.prismaService.productionOrderPreSecondaryPackagingChecks.findMany(
      {
        where: { production_order_id: productionOrderId },
        select: checkSelect,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async findImageFile(filename: string) {
    const imagePaths = getPreSecondaryPackagingCheckImageLookupPaths(filename);
    if (imagePaths.length === 0) return null;

    const image =
      await this.prismaService.productionOrderPreSecondaryPackagingCheckImages.findFirst(
        {
          where: { image_path: { in: imagePaths } },
          select: { id: true },
        },
      );
    return image ? resolvePreSecondaryPackagingCheckImageFile(filename) : null;
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderPreSecondaryPackagingCheckDto,
    user?: AuthenticatedUser,
    imagePaths: string[] = [],
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    this.ensureImageCount(imagePaths.length);
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

    return this.prismaService.productionOrderPreSecondaryPackagingChecks.create(
      {
        data: {
          production_order_id: productionOrderId,
          requirement: this.normalizeRequiredText(
            dto?.requirement,
            'requirement',
          ),
          quantity_checked: quantityChecked,
          quantity_passed: quantityPassed,
          created_by_id: this.normalizeUserId(user),
          images: imagePaths.length
            ? { create: imagePaths.map((image_path) => ({ image_path })) }
            : undefined,
        },
        select: checkSelect,
      },
    );
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderPreSecondaryPackagingCheckDto,
  ) {
    const existingCheck = await this.findById(checkId);
    const input = dto ?? {};
    const data: Prisma.ProductionOrderPreSecondaryPackagingChecksUpdateInput =
      {};
    const hasChecked = 'quantity_checked' in input;
    const hasPassed = 'quantity_passed' in input;

    if ('requirement' in input) {
      data.requirement = this.normalizeRequiredText(
        input.requirement,
        'requirement',
      );
    }

    const quantityChecked = hasChecked
      ? this.normalizeQuantity(input.quantity_checked, 'quantity_checked', true)
      : existingCheck.quantity_checked;
    const quantityPassed = hasPassed
      ? this.normalizeQuantity(input.quantity_passed, 'quantity_passed', false)
      : existingCheck.quantity_passed;
    if (hasChecked || hasPassed) {
      this.ensurePassedQuantityIsValid(quantityChecked, quantityPassed);
      if (hasChecked) data.quantity_checked = quantityChecked;
      if (hasPassed) data.quantity_passed = quantityPassed;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one field is required');
    }
    return this.prismaService.productionOrderPreSecondaryPackagingChecks.update(
      {
        where: { id: checkId },
        data,
        select: checkSelect,
      },
    );
  }

  async addImages(checkId: number, imagePaths: string[]) {
    if (!imagePaths.length)
      throw new BadRequestException('images are required');
    const check = await this.findById(checkId);
    this.ensureImageCount(check.images.length + imagePaths.length);
    await this.prismaService.productionOrderPreSecondaryPackagingCheckImages.createMany(
      {
        data: imagePaths.map((image_path) => ({
          check_id: checkId,
          image_path,
        })),
      },
    );
    return this.findById(checkId);
  }

  async deleteImage(imageId: number) {
    const image =
      await this.prismaService.productionOrderPreSecondaryPackagingCheckImages.findUnique(
        {
          where: { id: imageId },
        },
      );
    if (!image)
      throw new NotFoundException(
        'Pre-secondary packaging check image not found',
      );
    await this.prismaService.productionOrderPreSecondaryPackagingCheckImages.delete(
      {
        where: { id: imageId },
      },
    );
    await removePreSecondaryPackagingCheckImagesByPath([image.image_path]);
    return image;
  }

  async delete(checkId: number) {
    const check = await this.findById(checkId);
    const deletedCheck =
      await this.prismaService.productionOrderPreSecondaryPackagingChecks.delete(
        {
          where: { id: checkId },
          select: checkSelect,
        },
      );
    await removePreSecondaryPackagingCheckImagesByPath(
      check.images.map((image) => image.image_path),
    );
    return deletedCheck;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });
    if (!productionOrder)
      throw new NotFoundException('Production order not found');
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined || !String(value).trim()) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return String(value).trim();
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
        `${fieldName} must be ${mustBePositive ? 'greater than 0' : 'greater than or equal to 0'}`,
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

  private ensureImageCount(imageCount: number) {
    if (imageCount > MAX_PRE_SECONDARY_PACKAGING_CHECK_IMAGE_COUNT) {
      throw new BadRequestException(
        `images cannot exceed ${MAX_PRE_SECONDARY_PACKAGING_CHECK_IMAGE_COUNT} files per check`,
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
