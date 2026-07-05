import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderSamplingRecordDto } from './dto/create-production-order-sampling-record.dto';
import { UpdateProductionOrderSamplingRecordDto } from './dto/update-production-order-sampling-record.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const QUANTITY_DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const QUANTITY_INTEGER_DIGITS = 10;

const samplingRecordCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const samplingRecordInclude = {
  createdBy: {
    select: samplingRecordCreatorSelect,
  },
} satisfies Prisma.ProductionOrderSamplingRecordsInclude;

@Injectable()
export class ProductionOrderSamplingRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(recordId: number) {
    const samplingRecord =
      await this.prismaService.productionOrderSamplingRecords.findUnique({
        where: {
          id: recordId,
        },
        include: samplingRecordInclude,
      });

    if (!samplingRecord) {
      throw new NotFoundException('Sampling record not found');
    }

    return samplingRecord;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSamplingRecords.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: samplingRecordInclude,
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
    dto: CreateProductionOrderSamplingRecordDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderSamplingRecords.create({
      data: {
        production_order_id: productionOrderId,
        sampling_type: this.normalizeRequiredString(
          dto?.sampling_type,
          'sampling_type',
          100,
        ),
        quantity: this.normalizeRequiredQuantity(dto?.quantity, 'quantity'),
        unit: this.normalizeRequiredString(dto?.unit, 'unit', 50),
        created_by_id: this.normalizeUserId(user),
      },
      include: samplingRecordInclude,
    });
  }

  async update(
    recordId: number,
    dto: UpdateProductionOrderSamplingRecordDto,
  ) {
    await this.ensureSamplingRecordExists(recordId);

    return this.prismaService.productionOrderSamplingRecords.update({
      where: {
        id: recordId,
      },
      data: this.normalizeUpdateData(dto),
      include: samplingRecordInclude,
    });
  }

  async delete(recordId: number) {
    await this.ensureSamplingRecordExists(recordId);

    return this.prismaService.productionOrderSamplingRecords.delete({
      where: {
        id: recordId,
      },
      include: samplingRecordInclude,
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

  private async ensureSamplingRecordExists(recordId: number) {
    const samplingRecord =
      await this.prismaService.productionOrderSamplingRecords.findUnique({
        where: {
          id: recordId,
        },
        select: {
          id: true,
        },
      });

    if (!samplingRecord) {
      throw new NotFoundException('Sampling record not found');
    }
  }

  private normalizeUpdateData(dto: UpdateProductionOrderSamplingRecordDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderSamplingRecordsUpdateInput = {};

    if ('sampling_type' in updateDto) {
      data.sampling_type = this.normalizeRequiredString(
        updateDto.sampling_type,
        'sampling_type',
        100,
      );
    }

    if ('quantity' in updateDto) {
      data.quantity = this.normalizeRequiredQuantity(
        updateDto.quantity,
        'quantity',
      );
    }

    if ('unit' in updateDto) {
      data.unit = this.normalizeRequiredString(updateDto.unit, 'unit', 50);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return data;
  }

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredQuantity(value: unknown, fieldName: string) {
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

    if (!QUANTITY_DECIMAL_PATTERN.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 2) with up to 2 decimal places`,
      );
    }

    const [integerPart] = normalizedValue.split('.');

    if (integerPart.length > QUANTITY_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 2)`);
    }

    const decimalValue = new Prisma.Decimal(normalizedValue);

    if (decimalValue.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than 0`);
    }

    return decimalValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
