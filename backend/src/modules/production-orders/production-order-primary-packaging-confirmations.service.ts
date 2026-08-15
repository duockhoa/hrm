import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderPrimaryPackagingConfirmationDto } from './dto/create-production-order-primary-packaging-confirmation.dto';
import { UpdateProductionOrderPrimaryPackagingConfirmationDto } from './dto/update-production-order-primary-packaging-confirmation.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

type PrimaryPackagingConfirmationPatch = Partial<
  Pick<
    Prisma.ProductionOrderPrimaryPackagingConfirmationsUncheckedCreateInput,
    | 'volume_weight_checked'
    | 'sensory_checked'
    | 'date_print_checked'
    | 'hygiene_checked'
    | 'seal_integrity_checked'
    | 'note'
  >
>;

const confirmationCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const confirmationInclude = {
  createdBy: {
    select: confirmationCreatorSelect,
  },
} satisfies Prisma.ProductionOrderPrimaryPackagingConfirmationsInclude;

@Injectable()
export class ProductionOrderPrimaryPackagingConfirmationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(confirmationId: number) {
    const confirmation =
      await this.prismaService.productionOrderPrimaryPackagingConfirmations.findUnique({
        where: { id: confirmationId },
        include: confirmationInclude,
      });

    if (!confirmation) {
      throw new NotFoundException('Primary packaging confirmation not found');
    }

    return confirmation;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderPrimaryPackagingConfirmations.findMany({
      where: { production_order_id: productionOrderId },
      include: confirmationInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderPrimaryPackagingConfirmationDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    return this.prismaService.productionOrderPrimaryPackagingConfirmations.create({
      data: {
        production_order_id: productionOrderId,
        created_by_id: this.normalizeUserId(user),
        ...this.normalizeCreateData(dto),
      },
      include: confirmationInclude,
    });
  }

  async update(
    confirmationId: number,
    dto: UpdateProductionOrderPrimaryPackagingConfirmationDto,
  ) {
    await this.findById(confirmationId);
    const data = this.normalizeUpdateData(dto);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one confirmation field must be provided',
      );
    }

    return this.prismaService.productionOrderPrimaryPackagingConfirmations.update({
      where: { id: confirmationId },
      data,
      include: confirmationInclude,
    });
  }

  async delete(confirmationId: number) {
    await this.findById(confirmationId);

    return this.prismaService.productionOrderPrimaryPackagingConfirmations.delete({
      where: { id: confirmationId },
      include: confirmationInclude,
    });
  }

  private normalizeCreateData(
    dto: CreateProductionOrderPrimaryPackagingConfirmationDto,
  ): PrimaryPackagingConfirmationPatch {
    return {
      volume_weight_checked: this.normalizeRequiredBoolean(
        dto?.volume_weight_checked,
        'volume_weight_checked',
      ),
      sensory_checked: this.normalizeRequiredBoolean(
        dto?.sensory_checked,
        'sensory_checked',
      ),
      date_print_checked: this.normalizeRequiredBoolean(
        dto?.date_print_checked,
        'date_print_checked',
      ),
      hygiene_checked: this.normalizeRequiredBoolean(
        dto?.hygiene_checked,
        'hygiene_checked',
      ),
      seal_integrity_checked: this.normalizeRequiredBoolean(
        dto?.seal_integrity_checked,
        'seal_integrity_checked',
      ),
      note: this.normalizeOptionalText(dto?.note),
    };
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderPrimaryPackagingConfirmationDto,
  ): PrimaryPackagingConfirmationPatch {
    const updateDto = dto ?? {};
    const data: PrimaryPackagingConfirmationPatch = {};

    for (const field of [
      'volume_weight_checked',
      'sensory_checked',
      'date_print_checked',
      'hygiene_checked',
      'seal_integrity_checked',
    ] as const) {
      if (field in updateDto) {
        const value = updateDto[field];
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`${field} must be a boolean`);
        }
        data[field] = value;
      }
    }

    if ('note' in updateDto) {
      data.note = this.normalizeOptionalText(updateDto.note);
    }

    return data;
  }

  private async ensureProductionOrderExists(productionOrderId: number) {
    const productionOrder = await this.prismaService.productionOrders.findUnique({
      where: { id: productionOrderId },
      select: { id: true },
    });

    if (!productionOrder) {
      throw new NotFoundException('Production order not found');
    }
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return userId;
  }

  private normalizeRequiredBoolean(value: unknown, field: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${field} must be a boolean`);
    }
    return value;
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('note must be a string');
    }
    const normalized = value.trim();
    return normalized || null;
  }
}
