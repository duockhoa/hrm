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
        productLine: true,
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
          productLine: true,
        },
      });

    if (!specification) {
      throw new NotFoundException('Production specification not found');
    }

    return specification;
  }

  async create(createDto: CreateProductionSpecificationDto) {
    const data = await this.buildCreateData(createDto);

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
          productLine: true,
        },
      });
    }

    return this.prismaService.productionSpecifications.create({
      data,
      include: {
        item: true,
        productLine: true,
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
      const createData = await this.buildCreateData({
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
            productLine: true,
          },
        });
      }

      return this.prismaService.productionSpecifications.create({
        data: createData,
        include: {
          item: true,
          productLine: true,
        },
      });
    }

    const data = await this.buildUpdateData(updateDto);

    return this.prismaService.productionSpecifications.update({
      where: {
        item_code: normalizedItemCode,
      },
      data,
      include: {
        item: true,
        productLine: true,
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
        productLine: true,
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

  private async buildCreateData(
    dto: CreateProductionSpecificationDto,
  ): Promise<Prisma.ProductionSpecificationsUncheckedCreateInput> {
    return {
      item_code: this.normalizeRequiredString(dto.item_code, 'item_code'),
      product_line_id: await this.resolveProductLineId(dto),
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
      spray_dose_lower_allowed_limit: this.normalizeOptionalDecimal(
        dto.spray_dose_lower_allowed_limit,
        'spray_dose_lower_allowed_limit',
      ),
      spray_dose_upper_allowed_limit: this.normalizeOptionalDecimal(
        dto.spray_dose_upper_allowed_limit,
        'spray_dose_upper_allowed_limit',
      ),
      spray_dose_lower_control_limit: this.normalizeOptionalDecimal(
        dto.spray_dose_lower_control_limit,
        'spray_dose_lower_control_limit',
      ),
      spray_dose_upper_control_limit: this.normalizeOptionalDecimal(
        dto.spray_dose_upper_control_limit,
        'spray_dose_upper_control_limit',
      ),
      film_coated_tablet_weight_lower_control_limit:
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_lower_control_limit,
          'film_coated_tablet_weight_lower_control_limit',
        ),
      film_coated_tablet_weight_upper_control_limit:
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_upper_control_limit,
          'film_coated_tablet_weight_upper_control_limit',
        ),
      film_coated_tablet_weight_lower_allowed_limit:
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_lower_allowed_limit,
          'film_coated_tablet_weight_lower_allowed_limit',
        ),
      film_coated_tablet_weight_upper_allowed_limit:
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_upper_allowed_limit,
          'film_coated_tablet_weight_upper_allowed_limit',
        ),
      film_coated_tablet_weight_unit: this.normalizeOptionalString(
        dto.film_coated_tablet_weight_unit,
        'film_coated_tablet_weight_unit',
      ),
    };
  }

  private async buildUpdateData(dto: UpdateProductionSpecificationDto) {
    const data: Prisma.ProductionSpecificationsUncheckedUpdateInput = {};

    if (this.hasProductLineInput(dto)) {
      data.product_line_id = await this.resolveProductLineId(dto);
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

    if (dto.spray_dose_lower_allowed_limit !== undefined) {
      data.spray_dose_lower_allowed_limit = this.normalizeOptionalDecimal(
        dto.spray_dose_lower_allowed_limit,
        'spray_dose_lower_allowed_limit',
      );
    }

    if (dto.spray_dose_upper_allowed_limit !== undefined) {
      data.spray_dose_upper_allowed_limit = this.normalizeOptionalDecimal(
        dto.spray_dose_upper_allowed_limit,
        'spray_dose_upper_allowed_limit',
      );
    }

    if (dto.spray_dose_lower_control_limit !== undefined) {
      data.spray_dose_lower_control_limit = this.normalizeOptionalDecimal(
        dto.spray_dose_lower_control_limit,
        'spray_dose_lower_control_limit',
      );
    }

    if (dto.spray_dose_upper_control_limit !== undefined) {
      data.spray_dose_upper_control_limit = this.normalizeOptionalDecimal(
        dto.spray_dose_upper_control_limit,
        'spray_dose_upper_control_limit',
      );
    }

    if (dto.film_coated_tablet_weight_lower_control_limit !== undefined) {
      data.film_coated_tablet_weight_lower_control_limit =
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_lower_control_limit,
          'film_coated_tablet_weight_lower_control_limit',
        );
    }

    if (dto.film_coated_tablet_weight_upper_control_limit !== undefined) {
      data.film_coated_tablet_weight_upper_control_limit =
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_upper_control_limit,
          'film_coated_tablet_weight_upper_control_limit',
        );
    }

    if (dto.film_coated_tablet_weight_lower_allowed_limit !== undefined) {
      data.film_coated_tablet_weight_lower_allowed_limit =
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_lower_allowed_limit,
          'film_coated_tablet_weight_lower_allowed_limit',
        );
    }

    if (dto.film_coated_tablet_weight_upper_allowed_limit !== undefined) {
      data.film_coated_tablet_weight_upper_allowed_limit =
        this.normalizeOptionalDecimal(
          dto.film_coated_tablet_weight_upper_allowed_limit,
          'film_coated_tablet_weight_upper_allowed_limit',
        );
    }

    if (dto.film_coated_tablet_weight_unit !== undefined) {
      data.film_coated_tablet_weight_unit = this.normalizeOptionalString(
        dto.film_coated_tablet_weight_unit,
        'film_coated_tablet_weight_unit',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return data;
  }

  private hasProductLineInput(
    dto: CreateProductionSpecificationDto | UpdateProductionSpecificationDto,
  ) {
    return (
      dto.product_line_id !== undefined ||
      dto.productLineId !== undefined ||
      dto.product_line !== undefined
    );
  }

  private async resolveProductLineId(
    dto: CreateProductionSpecificationDto | UpdateProductionSpecificationDto,
  ) {
    if (dto.product_line_id !== undefined || dto.productLineId !== undefined) {
      const productLineId = this.normalizeOptionalInt(
        dto.product_line_id ?? dto.productLineId,
        'product_line_id',
      );

      if (productLineId === null) {
        return null;
      }

      await this.ensureProductLineExists(productLineId);

      return productLineId;
    }

    const productLineName = this.normalizeOptionalString(
      dto.product_line,
      'product_line',
    );

    if (productLineName === null) {
      return null;
    }

    return this.findOrCreateProductLineId(productLineName);
  }

  private async ensureProductLineExists(id: number) {
    const productLine = await this.prismaService.productLines.findUnique({
      where: { id },
    });

    if (!productLine) {
      throw new NotFoundException('Product line not found');
    }
  }

  private async findOrCreateProductLineId(name: string) {
    const existing = await this.prismaService.productLines.findFirst({
      where: { name },
    });

    if (existing) {
      return existing.id;
    }

    const productLine = await this.prismaService.productLines.create({
      data: {
        code: await this.buildProductLineCode(name),
        name,
      },
    });

    return productLine.id;
  }

  private async buildProductLineCode(name: string) {
    const baseCode =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase() || 'PRODUCT_LINE';
    let code = baseCode;
    let suffix = 2;

    while (
      await this.prismaService.productLines.findUnique({
        where: { code },
      })
    ) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    return code;
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

  private normalizeOptionalInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return normalizedValue;
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
