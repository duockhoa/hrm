import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderDeviationDto } from './dto/create-production-order-deviation.dto';
import { UpdateProductionOrderDeviationDto } from './dto/update-production-order-deviation.dto';

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
};

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

    return this.prismaService.productionOrderDeviations.findMany({
      where: {
        production_order_id: normalizedProductionOrderId ?? undefined,
        deleted_at: null,
      },
      include: productionOrderDeviationInclude,
      orderBy: {
        created_at: 'desc',
      },
    });
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

    return deviation;
  }

  async create(createDto: CreateProductionOrderDeviationDto) {
    const data = this.buildCreateData(createDto);

    await this.ensureProductionOrderExists(data.production_order_id);
    await this.ensureUserExists(data.reporter_id, 'Reporter');

    if (data.approver_id !== null && data.approver_id !== undefined) {
      await this.ensureUserExists(data.approver_id, 'Approver');
    }

    return this.prismaService.productionOrderDeviations.create({
      data,
      include: productionOrderDeviationInclude,
    });
  }

  async update(id: number, updateDto: UpdateProductionOrderDeviationDto) {
    await this.findById(id);

    const data = this.buildUpdateData(updateDto);

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

    return this.prismaService.productionOrderDeviations.update({
      where: {
        id,
      },
      data,
      include: productionOrderDeviationInclude,
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prismaService.productionOrderDeviations.update({
      where: {
        id,
      },
      data: {
        deleted_at: new Date(),
      },
      include: productionOrderDeviationInclude,
    });
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

  private buildCreateData(
    dto: CreateProductionOrderDeviationDto,
  ): Prisma.ProductionOrderDeviationsUncheckedCreateInput {
    return {
      production_order_id: this.normalizeRequiredInt(
        dto.production_order_id,
        'production_order_id',
      ),
      deviation_content: this.normalizeRequiredString(
        dto.deviation_content,
        'deviation_content',
      ),
      deviation_image: this.normalizeOptionalString(
        dto.deviation_image,
        'deviation_image',
      ),
      handling_plan: this.normalizeRequiredString(
        dto.handling_plan,
        'handling_plan',
      ),
      approver_id: this.normalizeOptionalInt(dto.approver_id, 'approver_id'),
      reporter_id: this.normalizeRequiredInt(dto.reporter_id, 'reporter_id'),
    };
  }

  private buildUpdateData(dto: UpdateProductionOrderDeviationDto) {
    const data: Prisma.ProductionOrderDeviationsUncheckedUpdateInput = {};

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

    if (dto.deviation_image !== undefined) {
      data.deviation_image = this.normalizeOptionalString(
        dto.deviation_image,
        'deviation_image',
      );
    }

    if (dto.handling_plan !== undefined) {
      data.handling_plan = this.normalizeRequiredString(
        dto.handling_plan,
        'handling_plan',
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

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
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
