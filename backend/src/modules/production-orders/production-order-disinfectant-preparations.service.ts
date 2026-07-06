import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderDisinfectantPreparationDto } from './dto/create-production-order-disinfectant-preparation.dto';
import { UpdateProductionOrderDisinfectantPreparationDto } from './dto/update-production-order-disinfectant-preparation.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const DECIMAL_10_4_PATTERN = /^\d+(?:\.\d{1,4})?$/;
const DECIMAL_12_4_PATTERN = /^\d+(?:\.\d{1,4})?$/;
const DECIMAL_10_4_INTEGER_DIGITS = 6;
const DECIMAL_12_4_INTEGER_DIGITS = 8;

const disinfectantPreparationCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const disinfectantPreparationInclude = {
  workshop: true,
  createdBy: {
    select: disinfectantPreparationCreatorSelect,
  },
} satisfies Prisma.ProductionOrderDisinfectantPreparationsInclude;

@Injectable()
export class ProductionOrderDisinfectantPreparationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(preparationId: number) {
    const preparation =
      await this.prismaService.productionOrderDisinfectantPreparations.findUnique(
        {
          where: {
            id: preparationId,
          },
          include: disinfectantPreparationInclude,
        },
      );

    if (!preparation) {
      throw new NotFoundException('Disinfectant preparation not found');
    }

    return preparation;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderDisinfectantPreparations.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: disinfectantPreparationInclude,
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
    dto: CreateProductionOrderDisinfectantPreparationDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    const workshopId = this.normalizeRequiredPositiveInteger(
      dto?.workshop_id,
      'workshop_id',
    );
    await this.ensureProductionWorkshopExists(workshopId);

    return this.prismaService.productionOrderDisinfectantPreparations.create({
      data: {
        production_order_id: productionOrderId,
        workshop_id: workshopId,
        disinfectant_name: this.normalizeRequiredString(
          dto?.disinfectant_name,
          'disinfectant_name',
          255,
        ),
        purpose: this.normalizeRequiredText(dto?.purpose, 'purpose'),
        base_material_name: this.normalizeRequiredString(
          dto?.base_material_name,
          'base_material_name',
          255,
        ),
        base_material_content: this.normalizeRequiredDecimal(
          dto?.base_material_content,
          'base_material_content',
          DECIMAL_10_4_PATTERN,
          DECIMAL_10_4_INTEGER_DIGITS,
          'DECIMAL(10, 4)',
        ),
        base_material_amount_l: this.normalizeRequiredDecimal(
          dto?.base_material_amount_l,
          'base_material_amount_l',
          DECIMAL_12_4_PATTERN,
          DECIMAL_12_4_INTEGER_DIGITS,
          'DECIMAL(12, 4)',
        ),
        prepared_volume_l: this.normalizeRequiredDecimal(
          dto?.prepared_volume_l,
          'prepared_volume_l',
          DECIMAL_12_4_PATTERN,
          DECIMAL_12_4_INTEGER_DIGITS,
          'DECIMAL(12, 4)',
        ),
        actual_concentration: this.normalizeRequiredDecimal(
          dto?.actual_concentration,
          'actual_concentration',
          DECIMAL_10_4_PATTERN,
          DECIMAL_10_4_INTEGER_DIGITS,
          'DECIMAL(10, 4)',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: disinfectantPreparationInclude,
    });
  }

  async update(
    preparationId: number,
    dto: UpdateProductionOrderDisinfectantPreparationDto,
  ) {
    await this.findById(preparationId);

    const data: Prisma.ProductionOrderDisinfectantPreparationsUncheckedUpdateInput =
      {};

    if ('workshop_id' in (dto ?? {})) {
      const workshopId = this.normalizeRequiredPositiveInteger(
        dto.workshop_id,
        'workshop_id',
      );
      await this.ensureProductionWorkshopExists(workshopId);
      data.workshop_id = workshopId;
    }

    if ('disinfectant_name' in (dto ?? {})) {
      data.disinfectant_name = this.normalizeRequiredString(
        dto.disinfectant_name,
        'disinfectant_name',
        255,
      );
    }

    if ('purpose' in (dto ?? {})) {
      data.purpose = this.normalizeRequiredText(dto.purpose, 'purpose');
    }

    if ('base_material_name' in (dto ?? {})) {
      data.base_material_name = this.normalizeRequiredString(
        dto.base_material_name,
        'base_material_name',
        255,
      );
    }

    if ('base_material_content' in (dto ?? {})) {
      data.base_material_content = this.normalizeRequiredDecimal(
        dto.base_material_content,
        'base_material_content',
        DECIMAL_10_4_PATTERN,
        DECIMAL_10_4_INTEGER_DIGITS,
        'DECIMAL(10, 4)',
      );
    }

    if ('base_material_amount_l' in (dto ?? {})) {
      data.base_material_amount_l = this.normalizeRequiredDecimal(
        dto.base_material_amount_l,
        'base_material_amount_l',
        DECIMAL_12_4_PATTERN,
        DECIMAL_12_4_INTEGER_DIGITS,
        'DECIMAL(12, 4)',
      );
    }

    if ('prepared_volume_l' in (dto ?? {})) {
      data.prepared_volume_l = this.normalizeRequiredDecimal(
        dto.prepared_volume_l,
        'prepared_volume_l',
        DECIMAL_12_4_PATTERN,
        DECIMAL_12_4_INTEGER_DIGITS,
        'DECIMAL(12, 4)',
      );
    }

    if ('actual_concentration' in (dto ?? {})) {
      data.actual_concentration = this.normalizeRequiredDecimal(
        dto.actual_concentration,
        'actual_concentration',
        DECIMAL_10_4_PATTERN,
        DECIMAL_10_4_INTEGER_DIGITS,
        'DECIMAL(10, 4)',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prismaService.productionOrderDisinfectantPreparations.update({
      where: {
        id: preparationId,
      },
      data,
      include: disinfectantPreparationInclude,
    });
  }

  async delete(preparationId: number) {
    const preparation = await this.findById(preparationId);

    await this.prismaService.productionOrderDisinfectantPreparations.delete({
      where: {
        id: preparationId,
      },
    });

    return preparation;
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

  private async ensureProductionWorkshopExists(workshopId: number) {
    const productionWorkshop =
      await this.prismaService.productionWorkshops.findUnique({
        where: {
          id: workshopId,
        },
        select: {
          id: true,
        },
      });

    if (!productionWorkshop) {
      throw new NotFoundException('Production workshop not found');
    }
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must be at most ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private normalizeRequiredDecimal(
    value: unknown,
    fieldName: string,
    pattern: RegExp,
    integerDigits: number,
    decimalType: string,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'number'
        ? String(value)
        : String(value).trim().replace(',', '.');

    if (normalizedValue === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (!pattern.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit ${decimalType} with up to 4 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > integerDigits) {
      throw new BadRequestException(`${fieldName} must fit ${decimalType}`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeRequiredPositiveInteger(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'string' ? value.trim() : String(value);

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    const integerValue = Number(normalizedValue);

    if (!Number.isInteger(integerValue) || integerValue <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return integerValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
