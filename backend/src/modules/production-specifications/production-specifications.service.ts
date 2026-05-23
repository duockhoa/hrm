import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionSpecificationDto } from './dto/create-production-specification.dto';
import { UpdateProductionSpecificationDto } from './dto/update-production-specification.dto';

const DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,6})?$/;
const DECIMAL_INTEGER_DIGITS = 12;

@Injectable()
export class ProductionSpecificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productionSpecifications.findMany({
      where: {
        deleted_at: null,
      },
      include: {
        item: true,
      },
      orderBy: {
        item_code: 'asc',
      },
    });
  }

  async findByItemCode(item_code: string) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );
    const specification =
      await this.prismaService.productionSpecifications.findFirst({
        where: {
          item_code: normalizedItemCode,
          deleted_at: null,
        },
        include: {
          item: true,
        },
      });

    if (!specification) {
      throw new NotFoundException('Production specification not found');
    }

    return specification;
  }

  async create(createDto: CreateProductionSpecificationDto) {
    const data = this.buildCreateData(createDto);

    await this.ensureItemExists(data.item_code);

    const existing =
      await this.prismaService.productionSpecifications.findUnique({
        where: {
          item_code: data.item_code,
        },
      });

    if (existing && !existing.deleted_at) {
      throw new ConflictException(
        'Production specification already exists for this item',
      );
    }

    if (existing) {
      const { item_code, ...restoreData } = data;

      return this.prismaService.productionSpecifications.update({
        where: {
          item_code,
        },
        data: {
          ...restoreData,
          deleted_at: null,
        },
        include: {
          item: true,
        },
      });
    }

    return this.prismaService.productionSpecifications.create({
      data,
      include: {
        item: true,
      },
    });
  }

  async update(item_code: string, updateDto: UpdateProductionSpecificationDto) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );

    await this.ensureItemExists(normalizedItemCode);

    const existing =
      await this.prismaService.productionSpecifications.findUnique({
        where: {
          item_code: normalizedItemCode,
        },
      });

    if (!existing || existing.deleted_at) {
      const createData = this.buildCreateData({
        ...updateDto,
        item_code: normalizedItemCode,
      } as CreateProductionSpecificationDto);

      if (existing) {
        const { item_code, ...restoreData } = createData;

        return this.prismaService.productionSpecifications.update({
          where: {
            item_code,
          },
          data: {
            ...restoreData,
            deleted_at: null,
          },
          include: {
            item: true,
          },
        });
      }

      return this.prismaService.productionSpecifications.create({
        data: createData,
        include: {
          item: true,
        },
      });
    }

    const data = this.buildUpdateData(updateDto);

    return this.prismaService.productionSpecifications.update({
      where: {
        item_code: normalizedItemCode,
      },
      data,
      include: {
        item: true,
      },
    });
  }

  async delete(item_code: string) {
    const normalizedItemCode = this.normalizeRequiredString(
      item_code,
      'item_code',
    );

    await this.findByItemCode(normalizedItemCode);

    return this.prismaService.productionSpecifications.update({
      where: {
        item_code: normalizedItemCode,
      },
      data: {
        deleted_at: new Date(),
      },
      include: {
        item: true,
      },
    });
  }

  private async ensureItemExists(item_code: string) {
    const item = await this.prismaService.items.findFirst({
      where: {
        item_code,
        deleted_at: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private buildCreateData(
    dto: CreateProductionSpecificationDto,
  ): Prisma.ProductionSpecificationsUncheckedCreateInput {
    return {
      item_code: this.normalizeRequiredString(dto.item_code, 'item_code'),
      product_line: this.normalizeOptionalString(
        dto.product_line,
        'product_line',
      ),
      dosage_form: this.normalizeOptionalString(dto.dosage_form, 'dosage_form'),
      lower_control_limit: this.normalizeOptionalDecimal(
        dto.lower_control_limit,
        'lower_control_limit',
      ),
      upper_control_limit: this.normalizeOptionalDecimal(
        dto.upper_control_limit,
        'upper_control_limit',
      ),
      lower_allowed_limit: this.normalizeOptionalDecimal(
        dto.lower_allowed_limit,
        'lower_allowed_limit',
      ),
      upper_allowed_limit: this.normalizeOptionalDecimal(
        dto.upper_allowed_limit,
        'upper_allowed_limit',
      ),
      unit: this.normalizeOptionalString(dto.unit, 'unit'),
    };
  }

  private buildUpdateData(dto: UpdateProductionSpecificationDto) {
    const data: Prisma.ProductionSpecificationsUncheckedUpdateInput = {};

    if (dto.product_line !== undefined) {
      data.product_line = this.normalizeOptionalString(
        dto.product_line,
        'product_line',
      );
    }

    if (dto.dosage_form !== undefined) {
      data.dosage_form = this.normalizeOptionalString(
        dto.dosage_form,
        'dosage_form',
      );
    }

    if (dto.lower_control_limit !== undefined) {
      data.lower_control_limit = this.normalizeOptionalDecimal(
        dto.lower_control_limit,
        'lower_control_limit',
      );
    }

    if (dto.upper_control_limit !== undefined) {
      data.upper_control_limit = this.normalizeOptionalDecimal(
        dto.upper_control_limit,
        'upper_control_limit',
      );
    }

    if (dto.lower_allowed_limit !== undefined) {
      data.lower_allowed_limit = this.normalizeOptionalDecimal(
        dto.lower_allowed_limit,
        'lower_allowed_limit',
      );
    }

    if (dto.upper_allowed_limit !== undefined) {
      data.upper_allowed_limit = this.normalizeOptionalDecimal(
        dto.upper_allowed_limit,
        'upper_allowed_limit',
      );
    }

    if (dto.unit !== undefined) {
      data.unit = this.normalizeOptionalString(dto.unit, 'unit');
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

  private normalizeOptionalDecimal(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (normalizedValue === '') {
      return null;
    }

    if (!DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must be a decimal with up to 6 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.replace('-', '').split('.');

    if (integerPart.length > DECIMAL_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(18, 6)`);
    }

    return new Prisma.Decimal(normalizedValue);
  }
}
