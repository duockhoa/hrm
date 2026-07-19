import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderMaterialSummaryDto } from './dto/create-production-order-material-summary.dto';
import { UpdateProductionOrderMaterialSummaryDto } from './dto/update-production-order-material-summary.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const QUANTITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const QUANTITY_INTEGER_DIGITS = 9;
const MAX_LOT_NO_LENGTH = 100;

const QUANTITY_FIELDS = [
  'received_quantity',
  'used_quantity',
  'supplier_waste_quantity',
  'production_waste_quantity',
  'remaining_quantity',
  'sample_quantity',
] as const;

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const materialSummaryInclude = {
  material: true,
  summarizedBy: {
    select: userSelect,
  },
  createdBy: {
    select: userSelect,
  },
} satisfies Prisma.ProductionOrderMaterialSummariesInclude;

@Injectable()
export class ProductionOrderMaterialSummariesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderMaterialSummaries.findUnique({
        where: { id: summaryId },
        include: materialSummaryInclude,
      });

    if (!summary) {
      throw new NotFoundException('Material summary not found');
    }

    return summary;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderMaterialSummaries.findMany({
      where: { production_order_id: productionOrderId },
      include: materialSummaryInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderMaterialSummaryDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const userId = this.normalizeUserId(user);
    const material = await this.findMaterialOrThrow(dto?.material_code);
    const summarizedById = this.normalizeOptionalUserId(
      dto?.summarized_by_id,
      userId,
    );
    await this.ensureUserExists(summarizedById);

    return this.prismaService.productionOrderMaterialSummaries.create({
      data: {
        production_order_id: productionOrderId,
        material_code: material.item_code,
        material_name: material.item_name,
        lot_no: this.normalizeOptionalText(
          dto?.lot_no,
          'lot_no',
          MAX_LOT_NO_LENGTH,
        ),
        unit: material.unit,
        received_quantity: this.normalizeOptionalQuantity(
          dto?.received_quantity,
          'received_quantity',
        ),
        used_quantity: this.normalizeOptionalQuantity(
          dto?.used_quantity,
          'used_quantity',
        ),
        supplier_waste_quantity: this.normalizeOptionalQuantity(
          dto?.supplier_waste_quantity,
          'supplier_waste_quantity',
        ),
        production_waste_quantity: this.normalizeOptionalQuantity(
          dto?.production_waste_quantity,
          'production_waste_quantity',
        ),
        remaining_quantity: this.normalizeOptionalQuantity(
          dto?.remaining_quantity,
          'remaining_quantity',
        ),
        sample_quantity: this.normalizeOptionalQuantity(
          dto?.sample_quantity,
          'sample_quantity',
        ),
        summarized_by_id: summarizedById,
        created_by_id: userId,
      },
      include: materialSummaryInclude,
    });
  }

  async update(
    summaryId: number,
    dto: UpdateProductionOrderMaterialSummaryDto,
  ) {
    await this.ensureSummaryExists(summaryId);
    const data = await this.normalizeUpdateData(dto);

    return this.prismaService.productionOrderMaterialSummaries.update({
      where: { id: summaryId },
      data,
      include: materialSummaryInclude,
    });
  }

  async delete(summaryId: number) {
    await this.ensureSummaryExists(summaryId);

    return this.prismaService.productionOrderMaterialSummaries.delete({
      where: { id: summaryId },
      include: materialSummaryInclude,
    });
  }

  private async normalizeUpdateData(
    dto: UpdateProductionOrderMaterialSummaryDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderMaterialSummariesUpdateInput = {};

    if ('material_code' in updateDto) {
      const material = await this.findMaterialOrThrow(updateDto.material_code);
      data.material = {
        connect: {
          item_code: material.item_code,
        },
      };
      data.material_name = material.item_name;
      data.unit = material.unit;
    }

    if ('lot_no' in updateDto) {
      data.lot_no = this.normalizeOptionalText(
        updateDto.lot_no,
        'lot_no',
        MAX_LOT_NO_LENGTH,
      );
    }

    for (const field of QUANTITY_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeOptionalQuantity(updateDto[field], field);
      }
    }

    if ('summarized_by_id' in updateDto) {
      const summarizedById = this.normalizeOptionalUserId(
        updateDto.summarized_by_id,
        null,
      );
      await this.ensureUserExists(summarizedById);
      data.summarizedBy =
        summarizedById === null
          ? { disconnect: true }
          : { connect: { id: summarizedById } };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeOptionalText(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (this.isEmptyValue(value)) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return text;
  }

  private normalizeOptionalQuantity(value: unknown, fieldName: string) {
    if (this.isEmptyValue(value)) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';

    if (!QUANTITY_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > QUANTITY_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }

    return new Prisma.Decimal(normalizedValue);
  }

  private isEmptyValue(value: unknown) {
    return (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    );
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder =
      await this.prismaService.productionOrders.findUnique({
        where: { id: productionOrderId },
        select: { id: true },
      });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private async ensureSummaryExists(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderMaterialSummaries.findUnique({
        where: { id: summaryId },
        select: { id: true },
      });

    if (!summary) {
      throw new NotFoundException('Material summary not found');
    }
  }

  private async findMaterialOrThrow(materialCode: unknown) {
    if (typeof materialCode !== 'string' || materialCode.trim() === '') {
      throw new BadRequestException('material_code is required');
    }

    const material = await this.prismaService.items.findUnique({
      where: { item_code: materialCode.trim() },
      select: {
        item_code: true,
        item_name: true,
        unit: true,
      },
    });

    if (!material) {
      throw new NotFoundException('Material item not found');
    }

    return material;
  }

  private normalizeOptionalUserId(value: unknown, defaultValue: number | null) {
    if (this.isEmptyValue(value)) {
      return defaultValue;
    }

    const userId = Number(value);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException(
        'summarized_by_id must be a positive integer',
      );
    }

    return userId;
  }

  private async ensureUserExists(userId: number | null) {
    if (userId === null) {
      return;
    }

    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Summarized user not found');
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
