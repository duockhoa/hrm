import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSensoryCheckDto } from './dto/create-production-order-sensory-check.dto';
import {
  getSensoryCheckImageLookupPaths,
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
