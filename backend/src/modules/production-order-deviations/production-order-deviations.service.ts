import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderDeviationDto } from './dto/create-production-order-deviation.dto';
import { UpdateProductionOrderDeviationDto } from './dto/update-production-order-deviation.dto';
import {
  getAuthenticatedDeviationImagePaths,
  getDeviationImageLookupPaths,
  removeStoredDeviationImages,
  resolveDeviationImageFile,
} from './production-order-deviation-upload.config';

const productionOrderDeviationUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  department: true,
  position: true,
  status: true,
};

const productionOrderDeviationInclude = {
  productionOrder: {
    include: {
      item: true,
    },
  },
  approver: {
    select: productionOrderDeviationUserSelect,
  },
  reporter: {
    select: productionOrderDeviationUserSelect,
  },
  images: {
    where: {
      deleted_at: null,
    },
    orderBy: {
      created_at: 'asc' as const,
    },
  },
} satisfies Prisma.ProductionOrderDeviationsInclude;

const DEVIATION_QUANTITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const DEVIATION_QUANTITY_INTEGER_DIGITS = 9;

@Injectable()
export class ProductionOrderDeviationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(productionOrderId?: string) {
    const normalizedProductionOrderId = this.normalizeOptionalInt(
      productionOrderId,
      'production_order_id',
    );

    if (normalizedProductionOrderId !== null) {
      await this.ensureProductionOrderExists(normalizedProductionOrderId);
    }

    const deviations =
      await this.prismaService.productionOrderDeviations.findMany({
        where: {
          production_order_id: normalizedProductionOrderId ?? undefined,
          deleted_at: null,
        },
        include: productionOrderDeviationInclude,
        orderBy: {
          created_at: 'desc',
        },
      });

    return deviations.map((deviation) =>
      this.withAuthenticatedImagePaths(deviation),
    );
  }

  async findImageFile(filename: string) {
    const imagePaths = getDeviationImageLookupPaths(filename);

    if (imagePaths.length === 0) {
      return null;
    }

    const image =
      await this.prismaService.productionOrderDeviationImages.findFirst({
        where: {
          image_path: {
            in: imagePaths,
          },
          deleted_at: null,
          deviation: {
            is: {
              deleted_at: null,
            },
          },
        },
        select: {
          id: true,
        },
      });

    if (!image) {
      return null;
    }

    return resolveDeviationImageFile(filename);
  }

  async findById(id: number) {
    const deviation =
      await this.prismaService.productionOrderDeviations.findFirst({
        where: {
          id,
          deleted_at: null,
        },
        include: productionOrderDeviationInclude,
      });

    if (!deviation) {
      throw new NotFoundException('Production order deviation not found');
    }

    return this.withAuthenticatedImagePaths(deviation);
  }

  async create(createDto: CreateProductionOrderDeviationDto) {
    const { data, imagePaths } = this.buildCreateData(createDto);

    await this.ensureProductionOrderExists(data.production_order_id);
    await this.ensureUserExists(data.reporter_id, 'Reporter');

    if (data.approver_id !== null && data.approver_id !== undefined) {
      await this.ensureUserExists(data.approver_id, 'Approver');
    }

    const deviation = await this.prismaService.$transaction(async (prisma) => {
      const createdDeviation = await prisma.productionOrderDeviations.create({
        data,
      });

      if (imagePaths.length > 0) {
        await prisma.productionOrderDeviationImages.createMany({
          data: imagePaths.map((imagePath) => ({
            deviation_id: createdDeviation.id,
            image_path: imagePath,
          })),
        });
      }

      return prisma.productionOrderDeviations.findFirst({
        where: {
          id: createdDeviation.id,
          deleted_at: null,
        },
        include: productionOrderDeviationInclude,
      });
    });

    if (!deviation) {
      throw new NotFoundException('Production order deviation not found');
    }

    return this.withAuthenticatedImagePaths(deviation);
  }

  async update(id: number, updateDto: UpdateProductionOrderDeviationDto) {
    const existingDeviation = await this.findById(id);

    const { data, imagePaths } = this.buildUpdateData(updateDto);

    if (data.production_order_id !== undefined) {
      await this.ensureProductionOrderExists(
        data.production_order_id as number,
      );
    }

    if (data.reporter_id !== undefined) {
      await this.ensureUserExists(data.reporter_id as number, 'Reporter');
    }

    if (data.approver_id !== null && data.approver_id !== undefined) {
      await this.ensureUserExists(data.approver_id as number, 'Approver');
    }

    const updatedDeviation = await this.prismaService.$transaction(
      async (prisma) => {
        const updateData =
          Object.keys(data).length > 0 ? data : { updated_at: new Date() };

        await prisma.productionOrderDeviations.update({
          where: {
            id,
          },
          data: updateData,
        });

        if (imagePaths !== undefined) {
          await prisma.productionOrderDeviationImages.updateMany({
            where: {
              deviation_id: id,
              deleted_at: null,
            },
            data: {
              deleted_at: new Date(),
            },
          });

          if (imagePaths.length > 0) {
            await prisma.productionOrderDeviationImages.createMany({
              data: imagePaths.map((imagePath) => ({
                deviation_id: id,
                image_path: imagePath,
              })),
            });
          }
        }

        return prisma.productionOrderDeviations.findFirst({
          where: {
            id,
            deleted_at: null,
          },
          include: productionOrderDeviationInclude,
        });
      },
    );

    if (!updatedDeviation) {
      throw new NotFoundException('Production order deviation not found');
    }

    if (imagePaths !== undefined) {
      const oldImagePaths = this.getDeviationImagePaths(existingDeviation);
      const removedImagePaths = oldImagePaths.filter(
        (imagePath) => !imagePaths.includes(imagePath),
      );

      await removeStoredDeviationImages(removedImagePaths);
    }

    return this.withAuthenticatedImagePaths(updatedDeviation);
  }

  async delete(id: number) {
    await this.findById(id);

    const deletedDeviation =
      await this.prismaService.productionOrderDeviations.update({
        where: {
          id,
        },
        data: {
          deleted_at: new Date(),
        },
        include: productionOrderDeviationInclude,
      });

    return this.withAuthenticatedImagePaths(deletedDeviation);
  }

  private withAuthenticatedImagePaths<
    T extends { images?: Array<{ image_path: string }> },
  >(deviation: T) {
    const images = (deviation.images ?? []).map((image) => ({
      ...image,
      image_path: getAuthenticatedDeviationImagePaths([image.image_path])[0],
    }));
    const deviationImages = images.map((image) => image.image_path);

    return {
      ...deviation,
      images,
      deviation_images: deviationImages,
      deviation_image: deviationImages[0] ?? null,
    };
  }

  private getDeviationImagePaths(deviation: { deviation_images?: string[] }) {
    return deviation.deviation_images ?? [];
  }

  private async ensureProductionOrderExists(id: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: {
          id,
        },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async ensureUserExists(id: number, label: string) {
    const user = await this.prismaService.users.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!user) {
      throw new NotFoundException(`${label} not found`);
    }
  }

  private buildCreateData(dto: CreateProductionOrderDeviationDto): {
    data: Prisma.ProductionOrderDeviationsUncheckedCreateInput;
    imagePaths: string[];
  } {
    const imageInput =
      dto.deviation_images !== undefined
        ? dto.deviation_images
        : dto.deviation_image;

    return {
      data: {
        production_order_id: this.normalizeRequiredInt(
          dto.production_order_id,
          'production_order_id',
        ),
        deviation_content: this.normalizeRequiredString(
          dto.deviation_content,
          'deviation_content',
        ),
        handling_plan: this.normalizeOptionalString(
          dto.handling_plan,
          'handling_plan',
        ),
        handling_result: this.normalizeOptionalString(
          dto.handling_result,
          'handling_result',
        ),
        cause: this.normalizeOptionalString(dto.cause, 'cause'),
        cause_classification: this.normalizeOptionalString(
          dto.cause_classification,
          'cause_classification',
        ),
        affected_quantity: this.normalizeOptionalDeviationQuantity(
          dto.affected_quantity,
          'affected_quantity',
        ),
        affected_quantity_unit: this.normalizeOptionalString(
          dto.affected_quantity_unit,
          'affected_quantity_unit',
        ),
        handled_quantity: this.normalizeOptionalDeviationQuantity(
          dto.handled_quantity,
          'handled_quantity',
        ),
        handled_quantity_unit: this.normalizeOptionalString(
          dto.handled_quantity_unit,
          'handled_quantity_unit',
        ),
        destroyed_quantity: this.normalizeOptionalDeviationQuantity(
          dto.destroyed_quantity,
          'destroyed_quantity',
        ),
        destroyed_quantity_unit: this.normalizeOptionalString(
          dto.destroyed_quantity_unit,
          'destroyed_quantity_unit',
        ),
        approver_id: this.normalizeOptionalInt(dto.approver_id, 'approver_id'),
        reporter_id: this.normalizeRequiredInt(dto.reporter_id, 'reporter_id'),
      },
      imagePaths: this.normalizeDeviationImages(imageInput),
    };
  }

  private buildUpdateData(dto: UpdateProductionOrderDeviationDto) {
    const data: Prisma.ProductionOrderDeviationsUncheckedUpdateInput = {};
    let imagePaths: string[] | undefined;

    if (
      dto.deviation_images !== undefined ||
      dto.deviation_image !== undefined
    ) {
      const imageInput =
        dto.deviation_images !== undefined
          ? dto.deviation_images
          : dto.deviation_image;

      imagePaths = this.normalizeDeviationImages(imageInput);
    }

    if (dto.production_order_id !== undefined) {
      data.production_order_id = this.normalizeRequiredInt(
        dto.production_order_id,
        'production_order_id',
      );
    }

    if (dto.deviation_content !== undefined) {
      data.deviation_content = this.normalizeRequiredString(
        dto.deviation_content,
        'deviation_content',
      );
    }

    if (dto.handling_plan !== undefined) {
      data.handling_plan = this.normalizeOptionalString(
        dto.handling_plan,
        'handling_plan',
      );
    }

    if (dto.handling_result !== undefined) {
      data.handling_result = this.normalizeOptionalString(
        dto.handling_result,
        'handling_result',
      );
    }

    if (dto.cause !== undefined) {
      data.cause = this.normalizeOptionalString(dto.cause, 'cause');
    }

    if (dto.cause_classification !== undefined) {
      data.cause_classification = this.normalizeOptionalString(
        dto.cause_classification,
        'cause_classification',
      );
    }

    if (dto.affected_quantity !== undefined) {
      data.affected_quantity = this.normalizeOptionalDeviationQuantity(
        dto.affected_quantity,
        'affected_quantity',
      );
    }

    if (dto.affected_quantity_unit !== undefined) {
      data.affected_quantity_unit = this.normalizeOptionalString(
        dto.affected_quantity_unit,
        'affected_quantity_unit',
      );
    }

    if (dto.handled_quantity !== undefined) {
      data.handled_quantity = this.normalizeOptionalDeviationQuantity(
        dto.handled_quantity,
        'handled_quantity',
      );
    }

    if (dto.handled_quantity_unit !== undefined) {
      data.handled_quantity_unit = this.normalizeOptionalString(
        dto.handled_quantity_unit,
        'handled_quantity_unit',
      );
    }

    if (dto.destroyed_quantity !== undefined) {
      data.destroyed_quantity = this.normalizeOptionalDeviationQuantity(
        dto.destroyed_quantity,
        'destroyed_quantity',
      );
    }

    if (dto.destroyed_quantity_unit !== undefined) {
      data.destroyed_quantity_unit = this.normalizeOptionalString(
        dto.destroyed_quantity_unit,
        'destroyed_quantity_unit',
      );
    }

    if (dto.approver_id !== undefined) {
      data.approver_id = this.normalizeOptionalInt(
        dto.approver_id,
        'approver_id',
      );
    }

    if (dto.reporter_id !== undefined) {
      data.reporter_id = this.normalizeRequiredInt(
        dto.reporter_id,
        'reporter_id',
      );
    }

    if (Object.keys(data).length === 0 && imagePaths === undefined) {
      throw new BadRequestException('No update data provided');
    }

    return {
      data,
      imagePaths,
    };
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const normalizedValue = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }

  private normalizeOptionalDeviationQuantity(value: unknown, fieldName: string) {
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
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!DEVIATION_QUANTITY_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > DEVIATION_QUANTITY_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }

    return new Prisma.Decimal(normalizedValue);
  }

  private normalizeDeviationImages(value: unknown) {
    return getAuthenticatedDeviationImagePaths(
      this.normalizeOptionalStringArray(value, 'deviation_images'),
    );
  }

  private normalizeOptionalStringArray(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        this.normalizeOptionalStringArray(item, fieldName),
      );
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string array`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue === '') {
      return [];
    }

    if (normalizedValue.startsWith('[')) {
      try {
        const parsedValue = JSON.parse(normalizedValue);

        if (!Array.isArray(parsedValue)) {
          throw new BadRequestException(`${fieldName} must be a string array`);
        }

        return this.normalizeOptionalStringArray(parsedValue, fieldName);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        throw new BadRequestException(`${fieldName} must be a string array`);
      }
    }

    return [normalizedValue];
  }

  private normalizeRequiredInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (typeof value === 'string' && value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'number' ? value : Number(String(value).trim());

    if (!Number.isInteger(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    return normalizedValue;
  }

  private normalizeOptionalInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    const normalizedValue =
      typeof value === 'number' ? value : Number(String(value).trim());

    if (!Number.isInteger(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    return normalizedValue;
  }
}
