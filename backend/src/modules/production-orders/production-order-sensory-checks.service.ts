import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSensoryCheckDto } from './dto/create-production-order-sensory-check.dto';
import { UpdateProductionOrderSensoryCheckDto } from './dto/update-production-order-sensory-check.dto';
import {
  getSensoryCheckImageLookupPaths,
  MAX_SENSORY_CHECK_IMAGE_COUNT,
  removeSensoryCheckImagesByPath,
  resolveSensoryCheckImageFile,
} from './production-order-sensory-check-upload.config';

type AuthenticatedUser = {
  id?: number | string | null;
};

const SENSORY_TEXT_MAX_LENGTH = 255;

const sensoryCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const sensoryCheckImageCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const sensoryCheckSelect = {
  id: true,
  production_order_id: true,
  color: true,
  smell: true,
  taste: true,
  note: true,
  created_by_id: true,
  created_at: true,
  updated_at: true,
  createdBy: {
    select: sensoryCheckCreatorSelect,
  },
  images: {
    include: {
      createdBy: {
        select: sensoryCheckImageCreatorSelect,
      },
    },
    orderBy: [
      {
        created_at: 'asc' as const,
      },
      {
        id: 'asc' as const,
      },
    ],
  },
} satisfies Prisma.ProductionOrderSensoryChecksSelect;

const sensoryCheckValueSelect = {
  id: true,
  color: true,
  smell: true,
  taste: true,
  note: true,
  images: {
    select: {
      image_path: true,
    },
  },
} satisfies Prisma.ProductionOrderSensoryChecksSelect;

type SensoryCheckValues = Prisma.ProductionOrderSensoryChecksGetPayload<{
  select: typeof sensoryCheckValueSelect;
}>;

@Injectable()
export class ProductionOrderSensoryChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const sensoryCheck =
      await this.prismaService.productionOrderSensoryChecks.findUnique({
        where: {
          id: checkId,
        },
        select: sensoryCheckSelect,
      });

    if (!sensoryCheck) {
      throw new NotFoundException('Sensory check not found');
    }

    return sensoryCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSensoryChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      select: sensoryCheckSelect,
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

  async findImageFile(filename: string, original = false) {
    const imagePaths = getSensoryCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const sensoryCheck =
      await this.prismaService.productionOrderSensoryCheckImages.findFirst({
        where: {
          image_path: {
            in: imagePaths,
          },
        },
        select: {
          id: true,
        },
      });

    if (!sensoryCheck) {
      return null;
    }

    return resolveSensoryCheckImageFile(filename, original);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSensoryCheckDto,
    user?: AuthenticatedUser,
    files: {
      imagePaths?: string[];
    } = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const imagePaths = files.imagePaths ?? [];

    if (imagePaths.length > MAX_SENSORY_CHECK_IMAGE_COUNT) {
      throw new BadRequestException(
        `images cannot exceed ${MAX_SENSORY_CHECK_IMAGE_COUNT} files per sensory check`,
      );
    }

    const userId = this.normalizeUserId(user);

    const data = {
      color: this.normalizeOptionalText(dto?.color, 'color'),
      smell: this.normalizeOptionalText(dto?.smell, 'smell'),
      taste: this.normalizeOptionalText(dto?.taste, 'taste'),
      note: this.normalizeOptionalLongText(dto?.note, 'note'),
    };

    if (
      Object.values(data).every((value) => value === null) &&
      imagePaths.length === 0
    ) {
      throw new BadRequestException(
        'At least one sensory check value is required',
      );
    }

    return this.prismaService.productionOrderSensoryChecks.create({
      data: {
        production_order_id: productionOrderId,
        ...data,
        created_by_id: userId,
        images:
          imagePaths.length > 0
            ? {
                create: imagePaths.map((imagePath) => ({
                  image_path: imagePath,
                  created_by_id: userId,
                })),
              }
            : undefined,
      },
      select: sensoryCheckSelect,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderSensoryCheckDto) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);
    const data = this.normalizeUpdateData(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    this.ensureUpdatedCheckHasValue(existingCheck, data);

    return this.prismaService.productionOrderSensoryChecks.update({
      where: { id: checkId },
      data,
      select: sensoryCheckSelect,
    });
  }

  async delete(checkId: number) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);

    const deletedCheck =
      await this.prismaService.productionOrderSensoryChecks.delete({
        where: { id: checkId },
        select: sensoryCheckSelect,
      });

    await removeSensoryCheckImagesByPath(
      existingCheck.images.map((image) => image.image_path),
    );

    return deletedCheck;
  }

  async addImages(
    checkId: number,
    imagePaths: string[],
    user?: AuthenticatedUser,
  ) {
    if (imagePaths.length === 0) {
      throw new BadRequestException('images are required');
    }

    const existingCheck = await this.findValuesByIdOrThrow(checkId);

    if (
      existingCheck.images.length + imagePaths.length >
      MAX_SENSORY_CHECK_IMAGE_COUNT
    ) {
      throw new BadRequestException(
        `images cannot exceed ${MAX_SENSORY_CHECK_IMAGE_COUNT} files per sensory check`,
      );
    }

    const userId = this.normalizeUserId(user);

    await this.prismaService.productionOrderSensoryCheckImages.createMany({
      data: imagePaths.map((imagePath) => ({
        sensory_check_id: checkId,
        image_path: imagePath,
        created_by_id: userId,
      })),
    });

    return this.findById(checkId);
  }

  async deleteImage(imageId: number) {
    const image =
      await this.prismaService.productionOrderSensoryCheckImages.findUnique({
        where: {
          id: imageId,
        },
        include: {
          sensoryCheck: {
            select: sensoryCheckValueSelect,
          },
        },
      });

    if (!image) {
      throw new NotFoundException('Sensory check image not found');
    }

    const hasTextValue = [
      image.sensoryCheck.color,
      image.sensoryCheck.smell,
      image.sensoryCheck.taste,
      image.sensoryCheck.note,
    ].some((value) => value !== null);

    if (!hasTextValue && image.sensoryCheck.images.length === 1) {
      throw new BadRequestException(
        'At least one sensory check value is required',
      );
    }

    await this.prismaService.productionOrderSensoryCheckImages.delete({
      where: {
        id: imageId,
      },
    });

    await removeSensoryCheckImagesByPath([image.image_path]);

    return image;
  }

  private normalizeUpdateData(dto: UpdateProductionOrderSensoryCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSensoryChecksUpdateInput = {};

    if ('color' in updateDto) {
      data.color = this.normalizeOptionalText(updateDto.color, 'color');
    }

    if ('smell' in updateDto) {
      data.smell = this.normalizeOptionalText(updateDto.smell, 'smell');
    }

    if ('taste' in updateDto) {
      data.taste = this.normalizeOptionalText(updateDto.taste, 'taste');
    }

    if ('note' in updateDto) {
      data.note = this.normalizeOptionalLongText(updateDto.note, 'note');
    }

    return data;
  }

  private ensureUpdatedCheckHasValue(
    existingCheck: SensoryCheckValues,
    data: Prisma.ProductionOrderSensoryChecksUpdateInput,
  ) {
    const finalTextValues = {
      color: 'color' in data ? data.color : existingCheck.color,
      smell: 'smell' in data ? data.smell : existingCheck.smell,
      taste: 'taste' in data ? data.taste : existingCheck.taste,
      note: 'note' in data ? data.note : existingCheck.note,
    };

    if (
      Object.values(finalTextValues).every((value) => value === null) &&
      existingCheck.images.length === 0
    ) {
      throw new BadRequestException(
        'At least one sensory check value is required',
      );
    }
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
    const sensoryCheck =
      await this.prismaService.productionOrderSensoryChecks.findUnique({
        where: { id: checkId },
        select: sensoryCheckValueSelect,
      });

    if (!sensoryCheck) {
      throw new NotFoundException('Sensory check not found');
    }

    return sensoryCheck;
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
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

    if (normalizedValue.length > SENSORY_TEXT_MAX_LENGTH) {
      throw new BadRequestException(
        `${fieldName} must be at most ${SENSORY_TEXT_MAX_LENGTH} characters`,
      );
    }

    return normalizedValue;
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
