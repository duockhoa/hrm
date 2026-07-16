import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFactoryReleaseReviewDto } from './dto/create-production-order-factory-release-review.dto';
import { UpdateProductionOrderFactoryReleaseReviewDto } from './dto/update-production-order-factory-release-review.dto';

const factoryReleaseReviewInclude = {
  productionOrder: {
    include: {
      item: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      department: true,
      position: true,
    },
  },
} satisfies Prisma.ProductionOrderFactoryReleaseReviewsInclude;

@Injectable()
export class ProductionOrderFactoryReleaseReviewsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(reviewId: number) {
    const review =
      await this.prismaService.productionOrderFactoryReleaseReviews.findUnique({
        where: {
          id: reviewId,
        },
        include: factoryReleaseReviewInclude,
      });

    if (!review) {
      throw new NotFoundException('Factory release review not found');
    }

    return review;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderFactoryReleaseReviews.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: factoryReleaseReviewInclude,
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
    dto: CreateProductionOrderFactoryReleaseReviewDto,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const data = this.normalizeCreateData(dto);

    if (typeof data.approved_by_id === 'number') {
      await this.ensureUserExists(data.approved_by_id);
    }

    return this.prismaService.productionOrderFactoryReleaseReviews.create({
      data: {
        production_order_id: productionOrderId,
        ...data,
      },
      include: factoryReleaseReviewInclude,
    });
  }

  async update(
    reviewId: number,
    dto: UpdateProductionOrderFactoryReleaseReviewDto,
  ) {
    await this.ensureReviewExists(reviewId);
    const data = this.normalizeUpdateData(dto);

    if (typeof data.approved_by_id === 'number') {
      await this.ensureUserExists(data.approved_by_id);
    }

    return this.prismaService.productionOrderFactoryReleaseReviews.update({
      where: {
        id: reviewId,
      },
      data,
      include: factoryReleaseReviewInclude,
    });
  }

  async delete(reviewId: number) {
    await this.ensureReviewExists(reviewId);

    return this.prismaService.productionOrderFactoryReleaseReviews.delete({
      where: {
        id: reviewId,
      },
      include: factoryReleaseReviewInclude,
    });
  }

  private normalizeCreateData(
    dto: CreateProductionOrderFactoryReleaseReviewDto,
  ): Omit<
    Prisma.ProductionOrderFactoryReleaseReviewsUncheckedCreateInput,
    'production_order_id'
  > {
    return {
      approved_by_id: this.normalizeOptionalInt(
        dto?.approved_by_id,
        'approved_by_id',
      ),
      registration_number: this.normalizeRequiredString(
        dto?.registration_number,
        'registration_number',
      ),
      raw_material_test_result: this.normalizeOptionalText(
        dto?.raw_material_test_result,
      ),
      water_test_result: this.normalizeOptionalText(dto?.water_test_result),
      compressed_air_test_result: this.normalizeOptionalText(
        dto?.compressed_air_test_result,
      ),
      filter_integrity_test_result: this.normalizeOptionalText(
        dto?.filter_integrity_test_result,
      ),
      packaging_inspection_result: this.normalizeOptionalText(
        dto?.packaging_inspection_result,
      ),
      finished_product_test_result: this.normalizeOptionalText(
        dto?.finished_product_test_result,
      ),
      sterilization_result: this.normalizeOptionalText(
        dto?.sterilization_result,
      ),
      online_particle_result: this.normalizeOptionalText(
        dto?.online_particle_result,
      ),
      yield_quantity: this.normalizeOptionalText(dto?.yield_quantity),
      deviation: this.normalizeOptionalText(dto?.deviation),
      environment_monitoring_result: this.normalizeOptionalText(
        dto?.environment_monitoring_result,
      ),
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderFactoryReleaseReviewDto,
  ): Prisma.ProductionOrderFactoryReleaseReviewsUncheckedUpdateInput {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderFactoryReleaseReviewsUncheckedUpdateInput =
      {};

    if ('approved_by_id' in updateDto) {
      data.approved_by_id = this.normalizeOptionalInt(
        updateDto.approved_by_id,
        'approved_by_id',
      );
    }

    if ('registration_number' in updateDto) {
      data.registration_number = this.normalizeRequiredString(
        updateDto.registration_number,
        'registration_number',
      );
    }

    if ('raw_material_test_result' in updateDto) {
      data.raw_material_test_result = this.normalizeOptionalText(
        updateDto.raw_material_test_result,
      );
    }

    if ('water_test_result' in updateDto) {
      data.water_test_result = this.normalizeOptionalText(
        updateDto.water_test_result,
      );
    }

    if ('compressed_air_test_result' in updateDto) {
      data.compressed_air_test_result = this.normalizeOptionalText(
        updateDto.compressed_air_test_result,
      );
    }

    if ('filter_integrity_test_result' in updateDto) {
      data.filter_integrity_test_result = this.normalizeOptionalText(
        updateDto.filter_integrity_test_result,
      );
    }

    if ('packaging_inspection_result' in updateDto) {
      data.packaging_inspection_result = this.normalizeOptionalText(
        updateDto.packaging_inspection_result,
      );
    }

    if ('finished_product_test_result' in updateDto) {
      data.finished_product_test_result = this.normalizeOptionalText(
        updateDto.finished_product_test_result,
      );
    }

    if ('sterilization_result' in updateDto) {
      data.sterilization_result = this.normalizeOptionalText(
        updateDto.sterilization_result,
      );
    }

    if ('online_particle_result' in updateDto) {
      data.online_particle_result = this.normalizeOptionalText(
        updateDto.online_particle_result,
      );
    }

    if ('yield_quantity' in updateDto) {
      data.yield_quantity = this.normalizeOptionalText(
        updateDto.yield_quantity,
      );
    }

    if ('deviation' in updateDto) {
      data.deviation = this.normalizeOptionalText(updateDto.deviation);
    }

    if ('environment_monitoring_result' in updateDto) {
      data.environment_monitoring_result = this.normalizeOptionalText(
        updateDto.environment_monitoring_result,
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

  private async ensureReviewExists(reviewId: number) {
    const review =
      await this.prismaService.productionOrderFactoryReleaseReviews.findUnique({
        where: {
          id: reviewId,
        },
        select: {
          id: true,
        },
      });

    if (!review) {
      throw new NotFoundException('Factory release review not found');
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
      throw new NotFoundException('Approved user not found');
    }
  }

  private normalizeRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeOptionalInt(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    const numberValue = Number(normalizedValue);

    if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return numberValue;
  }

  private normalizeOptionalText(value: unknown) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }

      throw new BadRequestException('Text fields must be strings');
    }

    return value.trim();
  }
}
