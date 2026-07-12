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
  removeSensoryCheckImageByPath,
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

const sensoryCheckInclude = {
  createdBy: {
    select: sensoryCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderSensoryChecksInclude;

const sensoryCheckValueSelect = {
  id: true,
  color: true,
  smell: true,
  taste: true,
  note: true,
  image_path: true,
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
        include: sensoryCheckInclude,
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
      include: sensoryCheckInclude,
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
    const imagePaths = getSensoryCheckImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const sensoryCheck =
      await this.prismaService.productionOrderSensoryChecks.findFirst({
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

    return resolveSensoryCheckImageFile(filename);
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderSensoryCheckDto,
    user?: AuthenticatedUser,
    files: {
      imagePath?: string;
    } = {},
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    const data = {
      color: this.normalizeOptionalText(dto?.color, 'color'),
      smell: this.normalizeOptionalText(dto?.smell, 'smell'),
      taste: this.normalizeOptionalText(dto?.taste, 'taste'),
      note: this.normalizeOptionalLongText(dto?.note, 'note'),
      image_path: files.imagePath ?? null,
    };

    if (Object.values(data).every((value) => value === null)) {
      throw new BadRequestException(
        'At least one sensory check value is required',
      );
    }

    return this.prismaService.productionOrderSensoryChecks.create({
      data: {
        production_order_id: productionOrderId,
        ...data,
        created_by_id: this.normalizeUserId(user),
      },
      include: sensoryCheckInclude,
    });
  }

  async update(
    checkId: number,
    dto: UpdateProductionOrderSensoryCheckDto,
    files: {
      imagePath?: string;
    } = {},
  ) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);
    const data = this.normalizeUpdateData(dto, files);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    this.ensureUpdatedCheckHasValue(existingCheck, data);

    const updatedCheck =
      await this.prismaService.productionOrderSensoryChecks.update({
        where: { id: checkId },
        data,
        include: sensoryCheckInclude,
      });

    if (
      files.imagePath &&
      existingCheck.image_path &&
      existingCheck.image_path !== files.imagePath
    ) {
      await removeSensoryCheckImageByPath(existingCheck.image_path);
    }

    return updatedCheck;
  }

  async delete(checkId: number) {
    const existingCheck = await this.findValuesByIdOrThrow(checkId);

    const deletedCheck =
      await this.prismaService.productionOrderSensoryChecks.delete({
        where: { id: checkId },
        include: sensoryCheckInclude,
      });

    await removeSensoryCheckImageByPath(existingCheck.image_path);

    return deletedCheck;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderSensoryCheckDto,
    files: {
      imagePath?: string;
    },
  ) {
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

    if (files.imagePath) {
      data.image_path = files.imagePath;
    }

    return data;
  }

  private ensureUpdatedCheckHasValue(
    existingCheck: SensoryCheckValues,
    data: Prisma.ProductionOrderSensoryChecksUpdateInput,
  ) {
    const finalValues = {
      color: 'color' in data ? data.color : existingCheck.color,
      smell: 'smell' in data ? data.smell : existingCheck.smell,
      taste: 'taste' in data ? data.taste : existingCheck.taste,
      note: 'note' in data ? data.note : existingCheck.note,
      image_path:
        'image_path' in data ? data.image_path : existingCheck.image_path,
    };

    if (Object.values(finalValues).every((value) => value === null)) {
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
