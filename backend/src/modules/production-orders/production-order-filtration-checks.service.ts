import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFiltrationCheckDto } from './dto/create-production-order-filtration-check.dto';
import { UpdateProductionOrderFiltrationCheckDto } from './dto/update-production-order-filtration-check.dto';

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const filtrationCheckInclude = {
  filterMembrane: true,
  sterilizedBy: { select: userSelect },
  filteredBy: { select: userSelect },
  inspectedAfterFilterBy: { select: userSelect },
} satisfies Prisma.ProductionOrderFiltrationChecksInclude;

@Injectable()
export class ProductionOrderFiltrationChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const check =
      await this.prismaService.productionOrderFiltrationChecks.findUnique({
        where: { id: checkId },
        include: filtrationCheckInclude,
      });

    if (!check) {
      throw new NotFoundException('Filtration check not found');
    }

    return check;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderFiltrationChecks.findMany({
      where: { production_order_id: productionOrderId },
      include: filtrationCheckInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderFiltrationCheckDto,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const data = this.normalizeCreateData(dto);
    await this.ensureReferencesExist(data as Record<string, unknown>);

    return this.prismaService.productionOrderFiltrationChecks.create({
      data: {
        production_order_id: productionOrderId,
        ...data,
      },
      include: filtrationCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderFiltrationCheckDto) {
    await this.ensureCheckExists(checkId);
    const data = this.normalizeUpdateData(dto);
    await this.ensureReferencesExist(data as Record<string, unknown>);

    return this.prismaService.productionOrderFiltrationChecks.update({
      where: { id: checkId },
      data,
      include: filtrationCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.ensureCheckExists(checkId);

    return this.prismaService.productionOrderFiltrationChecks.delete({
      where: { id: checkId },
      include: filtrationCheckInclude,
    });
  }

  private normalizeCreateData(
    dto: CreateProductionOrderFiltrationCheckDto,
  ): Omit<
    Prisma.ProductionOrderFiltrationChecksUncheckedCreateInput,
    'production_order_id'
  > {
    return this.normalizeData(dto ?? {}, false) as Omit<
      Prisma.ProductionOrderFiltrationChecksUncheckedCreateInput,
      'production_order_id'
    >;
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderFiltrationCheckDto,
  ): Prisma.ProductionOrderFiltrationChecksUncheckedUpdateInput {
    const data = this.normalizeData(dto ?? {}, true);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data as Prisma.ProductionOrderFiltrationChecksUncheckedUpdateInput;
  }

  private normalizeData(
    dto: CreateProductionOrderFiltrationCheckDto,
    partial: boolean,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const fields: Array<keyof CreateProductionOrderFiltrationCheckDto> = [
      'filter_position',
      'pre_filter_appearance_requirement',
      'pre_filter_appearance_result',
      'pre_sterilization_integrity_requirement',
      'pre_sterilization_integrity_result',
      'post_filter_integrity_requirement',
      'post_filter_integrity_result',
      'post_filter_membrane_appearance_requirement',
      'post_filter_membrane_appearance_result',
    ];

    for (const field of fields) {
      if (!partial || field in dto) {
        data[field] = this.normalizeOptionalText(dto[field]);
      }
    }

    const idFields: Array<keyof CreateProductionOrderFiltrationCheckDto> = [
      'filter_membrane_id',
      'sterilized_by_id',
      'filtered_by_id',
      'inspected_after_filter_by_id',
    ];

    for (const field of idFields) {
      if (!partial || field in dto) {
        data[field] = this.normalizeOptionalId(dto[field], field);
      }
    }

    const decimalFields: Array<keyof CreateProductionOrderFiltrationCheckDto> =
      ['rinse_water_volume_liters', 'tank_residual_volume_liters'];

    for (const field of decimalFields) {
      if (!partial || field in dto) {
        data[field] = this.normalizeOptionalNonNegativeDecimal(
          dto[field],
          field,
        );
      }
    }

    const dateFields: Array<keyof CreateProductionOrderFiltrationCheckDto> = [
      'filtering_started_at',
      'filtering_finished_at',
    ];

    for (const field of dateFields) {
      if (!partial || field in dto) {
        data[field] = this.normalizeOptionalDate(dto[field], field);
      }
    }

    return data;
  }

  private async ensureReferencesExist(data: Record<string, unknown>) {
    if (typeof data.filter_membrane_id === 'number') {
      const filter = await this.prismaService.filterCatalogs.findUnique({
        where: { id: data.filter_membrane_id },
        select: { id: true },
      });

      if (!filter) {
        throw new NotFoundException('Filter membrane not found');
      }
    }

    for (const field of [
      'sterilized_by_id',
      'filtered_by_id',
      'inspected_after_filter_by_id',
    ]) {
      const userId = data[field];

      if (typeof userId === 'number') {
        const user = await this.prismaService.users.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!user) {
          throw new NotFoundException(`${field} user not found`);
        }
      }
    }
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

  private async ensureCheckExists(checkId: number) {
    const check =
      await this.prismaService.productionOrderFiltrationChecks.findUnique({
        where: { id: checkId },
        select: { id: true },
      });

    if (!check) {
      throw new NotFoundException('Filtration check not found');
    }
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
      throw new BadRequestException('Text fields must be strings');
    }

    return value.trim();
  }

  private normalizeOptionalId(value: unknown, fieldName: string) {
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

  private normalizeOptionalNonNegativeDecimal(
    value: unknown,
    fieldName: string,
  ) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (!/^\d+(?:\.\d{1,3})?$/.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number with at most 3 decimal places`,
      );
    }

    return normalizedValue;
  }

  private normalizeOptionalDate(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return date;
  }
}
