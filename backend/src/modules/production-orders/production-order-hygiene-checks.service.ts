import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderHygieneCheckDto } from './dto/create-production-order-hygiene-check.dto';
import { UpdateProductionOrderHygieneCheckDto } from './dto/update-production-order-hygiene-check.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const hygieneCheckCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const hygieneCheckInclude = {
  createdBy: {
    select: hygieneCheckCreatorSelect,
  },
} satisfies Prisma.ProductionOrderHygieneChecksInclude;

@Injectable()
export class ProductionOrderHygieneChecksService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(checkId: number) {
    const hygieneCheck =
      await this.prismaService.productionOrderHygieneChecks.findUnique({
        where: {
          id: checkId,
        },
        include: hygieneCheckInclude,
      });

    if (!hygieneCheck) {
      throw new NotFoundException('Hygiene check not found');
    }

    return hygieneCheck;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderHygieneChecks.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: hygieneCheckInclude,
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
    dto: CreateProductionOrderHygieneCheckDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderHygieneChecks.create({
      data: {
        production_order_id: productionOrderId,
        room_or_equipment: this.normalizeRequiredString(
          dto?.room_or_equipment,
          'room_or_equipment',
          255,
        ),
        cleaning_type: this.normalizeRequiredString(
          dto?.cleaning_type,
          'cleaning_type',
          100,
        ),
        result: this.normalizeRequiredString(dto?.result, 'result', 100),
        note: this.normalizeOptionalText(dto?.note),
        created_by_id: this.normalizeUserId(user),
      },
      include: hygieneCheckInclude,
    });
  }

  async update(checkId: number, dto: UpdateProductionOrderHygieneCheckDto) {
    await this.findById(checkId);

    return this.prismaService.productionOrderHygieneChecks.update({
      where: {
        id: checkId,
      },
      data: this.normalizeUpdateData(dto),
      include: hygieneCheckInclude,
    });
  }

  async delete(checkId: number) {
    await this.findById(checkId);

    return this.prismaService.productionOrderHygieneChecks.delete({
      where: {
        id: checkId,
      },
      include: hygieneCheckInclude,
    });
  }

  private normalizeUpdateData(dto: UpdateProductionOrderHygieneCheckDto) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderHygieneChecksUpdateInput = {};

    if ('room_or_equipment' in updateDto) {
      data.room_or_equipment = this.normalizeRequiredString(
        updateDto.room_or_equipment,
        'room_or_equipment',
        255,
      );
    }

    if ('cleaning_type' in updateDto) {
      data.cleaning_type = this.normalizeRequiredString(
        updateDto.cleaning_type,
        'cleaning_type',
        100,
      );
    }

    if ('result' in updateDto) {
      data.result = this.normalizeRequiredString(
        updateDto.result,
        'result',
        100,
      );
    }

    if ('note' in updateDto) {
      data.note = this.normalizeOptionalText(updateDto.note);
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

  private normalizeRequiredString(
    value: unknown,
    fieldName: string,
    maxLength: number,
  ) {
    const normalizedValue = this.normalizeRequiredText(value, fieldName);

    if (normalizedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maxLength} characters`,
      );
    }

    return normalizedValue;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue = String(value).trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const normalizedValue = String(value).trim();

    return normalizedValue || null;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
