import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderPostSecondaryPackagingPendingCancellationItemDto } from './dto/create-production-order-post-secondary-packaging-pending-cancellation-item.dto';
import { CreateProductionOrderPostSecondaryPackagingPendingProcessItemDto } from './dto/create-production-order-post-secondary-packaging-pending-process-item.dto';
import { CreateProductionOrderPostSecondaryPackagingSummaryDto } from './dto/create-production-order-post-secondary-packaging-summary.dto';
import { UpdateProductionOrderPostSecondaryPackagingPendingCancellationItemDto } from './dto/update-production-order-post-secondary-packaging-pending-cancellation-item.dto';
import { UpdateProductionOrderPostSecondaryPackagingPendingProcessItemDto } from './dto/update-production-order-post-secondary-packaging-pending-process-item.dto';
import { UpdateProductionOrderPostSecondaryPackagingSummaryDto } from './dto/update-production-order-post-secondary-packaging-summary.dto';

type AuthenticatedUser = { id?: number | string | null };

const DECIMAL_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const DECIMAL_INTEGER_DIGITS = 9;

const creatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const pendingProcessInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.ProductionOrderPostSecondaryPackagingPendingProcessItemsInclude;

const pendingCancellationInclude = {
  createdBy: { select: creatorSelect },
} satisfies Prisma.ProductionOrderPostSecondaryPackagingPendingCancellationItemsInclude;

const summaryInclude = {
  createdBy: { select: creatorSelect },
  semiFinishedProductOrder: {
    include: {
      item: true,
    },
  },
  pendingProcessItems: {
    include: pendingProcessInclude,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  },
  pendingCancellationItems: {
    include: pendingCancellationInclude,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  },
} satisfies Prisma.ProductionOrderPostSecondaryPackagingSummariesInclude;

@Injectable()
export class ProductionOrderPostSecondaryPackagingSummariesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderPostSecondaryPackagingSummaries.findUnique(
        {
          where: { id: summaryId },
          include: summaryInclude,
        },
      );

    if (!summary) {
      throw new NotFoundException('Post-secondary packaging summary not found');
    }

    return summary;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderPostSecondaryPackagingSummaries.findMany(
      {
        where: { production_order_id: productionOrderId },
        include: summaryInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderPostSecondaryPackagingSummaryDto,
    user?: AuthenticatedUser,
  ) {
    const semiFinishedProductOrderId = this.normalizeRequiredId(
      dto?.semi_finished_product_order_id,
      'semi_finished_product_order_id',
    );
    this.ensureDifferentOrders(productionOrderId, semiFinishedProductOrderId);
    await Promise.all([
      this.ensureProductionOrderExists(productionOrderId),
      this.ensureProductionOrderExists(semiFinishedProductOrderId),
    ]);

    try {
      return await this.prismaService.productionOrderPostSecondaryPackagingSummaries.create(
        {
          data: {
            production_order_id: productionOrderId,
            semi_finished_product_order_id: semiFinishedProductOrderId,
            received_bag_count: this.normalizeRequiredNonNegativeInt(
              dto?.received_bag_count,
              'received_bag_count',
            ),
            remaining_quantity: this.normalizeRequiredQuantity(
              dto?.remaining_quantity,
              'remaining_quantity',
            ),
            remaining_reason: this.normalizeOptionalText(
              dto?.remaining_reason,
              'remaining_reason',
            ),
            created_by_id: this.normalizeUserId(user),
          },
          include: summaryInclude,
        },
      );
    } catch (error) {
      this.throwIfSemiFinishedOrderAlreadyLinked(error);
      throw error;
    }
  }

  async update(
    summaryId: number,
    dto: UpdateProductionOrderPostSecondaryPackagingSummaryDto,
  ) {
    const summary = await this.findSummaryValuesById(summaryId);
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderPostSecondaryPackagingSummariesUpdateInput =
      {};

    if ('semi_finished_product_order_id' in updateDto) {
      const semiFinishedProductOrderId = this.normalizeRequiredId(
        updateDto.semi_finished_product_order_id,
        'semi_finished_product_order_id',
      );
      this.ensureDifferentOrders(
        summary.production_order_id,
        semiFinishedProductOrderId,
      );
      await this.ensureProductionOrderExists(semiFinishedProductOrderId);
      data.semiFinishedProductOrder = {
        connect: { id: semiFinishedProductOrderId },
      };
    }

    if ('received_bag_count' in updateDto) {
      data.received_bag_count = this.normalizeRequiredNonNegativeInt(
        updateDto.received_bag_count,
        'received_bag_count',
      );
    }
    if ('remaining_quantity' in updateDto) {
      data.remaining_quantity = this.normalizeRequiredQuantity(
        updateDto.remaining_quantity,
        'remaining_quantity',
      );
    }
    if ('remaining_reason' in updateDto) {
      data.remaining_reason = this.normalizeOptionalText(
        updateDto.remaining_reason,
        'remaining_reason',
      );
    }

    this.ensureUpdateHasFields(data);

    try {
      return await this.prismaService.productionOrderPostSecondaryPackagingSummaries.update(
        {
          where: { id: summaryId },
          data,
          include: summaryInclude,
        },
      );
    } catch (error) {
      this.throwIfSemiFinishedOrderAlreadyLinked(error);
      throw error;
    }
  }

  async delete(summaryId: number) {
    await this.findSummaryValuesById(summaryId);
    return this.prismaService.productionOrderPostSecondaryPackagingSummaries.delete(
      {
        where: { id: summaryId },
        include: summaryInclude,
      },
    );
  }

  async findPendingProcessItems(summaryId: number) {
    await this.findSummaryValuesById(summaryId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingProcessItems.findMany(
      {
        where: { summary_id: summaryId },
        include: pendingProcessInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async createPendingProcessItem(
    summaryId: number,
    dto: CreateProductionOrderPostSecondaryPackagingPendingProcessItemDto,
    user?: AuthenticatedUser,
  ) {
    await this.findSummaryValuesById(summaryId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingProcessItems.create(
      {
        data: {
          summary_id: summaryId,
          pending_quantity: this.normalizeRequiredQuantity(
            dto?.pending_quantity,
            'pending_quantity',
          ),
          pending_reason: this.normalizeRequiredText(
            dto?.pending_reason,
            'pending_reason',
          ),
          processing_plan: this.normalizeOptionalText(
            dto?.processing_plan,
            'processing_plan',
          ),
          created_by_id: this.normalizeUserId(user),
        },
        include: pendingProcessInclude,
      },
    );
  }

  async findPendingProcessItemById(itemId: number) {
    const item =
      await this.prismaService.productionOrderPostSecondaryPackagingPendingProcessItems.findUnique(
        { where: { id: itemId }, include: pendingProcessInclude },
      );
    if (!item) {
      throw new NotFoundException('Pending process item not found');
    }
    return item;
  }

  async updatePendingProcessItem(
    itemId: number,
    dto: UpdateProductionOrderPostSecondaryPackagingPendingProcessItemDto,
  ) {
    await this.findPendingProcessItemById(itemId);
    const data = this.normalizePendingProcessUpdateData(dto);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingProcessItems.update(
      { where: { id: itemId }, data, include: pendingProcessInclude },
    );
  }

  async deletePendingProcessItem(itemId: number) {
    await this.findPendingProcessItemById(itemId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingProcessItems.delete(
      { where: { id: itemId }, include: pendingProcessInclude },
    );
  }

  async findPendingCancellationItems(summaryId: number) {
    await this.findSummaryValuesById(summaryId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems.findMany(
      {
        where: { summary_id: summaryId },
        include: pendingCancellationInclude,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      },
    );
  }

  async createPendingCancellationItem(
    summaryId: number,
    dto: CreateProductionOrderPostSecondaryPackagingPendingCancellationItemDto,
    user?: AuthenticatedUser,
  ) {
    await this.findSummaryValuesById(summaryId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems.create(
      {
        data: {
          summary_id: summaryId,
          cancellation_quantity: this.normalizeRequiredQuantity(
            dto?.cancellation_quantity,
            'cancellation_quantity',
          ),
          cancellation_reason: this.normalizeRequiredText(
            dto?.cancellation_reason,
            'cancellation_reason',
          ),
          cancellation_plan: this.normalizeOptionalText(
            dto?.cancellation_plan,
            'cancellation_plan',
          ),
          created_by_id: this.normalizeUserId(user),
        },
        include: pendingCancellationInclude,
      },
    );
  }

  async findPendingCancellationItemById(itemId: number) {
    const item =
      await this.prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems.findUnique(
        { where: { id: itemId }, include: pendingCancellationInclude },
      );
    if (!item) {
      throw new NotFoundException('Pending cancellation item not found');
    }
    return item;
  }

  async updatePendingCancellationItem(
    itemId: number,
    dto: UpdateProductionOrderPostSecondaryPackagingPendingCancellationItemDto,
  ) {
    await this.findPendingCancellationItemById(itemId);
    const data = this.normalizePendingCancellationUpdateData(dto);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems.update(
      { where: { id: itemId }, data, include: pendingCancellationInclude },
    );
  }

  async deletePendingCancellationItem(itemId: number) {
    await this.findPendingCancellationItemById(itemId);
    return this.prismaService.productionOrderPostSecondaryPackagingPendingCancellationItems.delete(
      { where: { id: itemId }, include: pendingCancellationInclude },
    );
  }

  private normalizePendingProcessUpdateData(
    dto: UpdateProductionOrderPostSecondaryPackagingPendingProcessItemDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderPostSecondaryPackagingPendingProcessItemsUpdateInput =
      {};
    if ('pending_quantity' in updateDto) {
      data.pending_quantity = this.normalizeRequiredQuantity(
        updateDto.pending_quantity,
        'pending_quantity',
      );
    }
    if ('pending_reason' in updateDto) {
      data.pending_reason = this.normalizeRequiredText(
        updateDto.pending_reason,
        'pending_reason',
      );
    }
    if ('processing_plan' in updateDto) {
      data.processing_plan = this.normalizeOptionalText(
        updateDto.processing_plan,
        'processing_plan',
      );
    }
    this.ensureUpdateHasFields(data);
    return data;
  }

  private normalizePendingCancellationUpdateData(
    dto: UpdateProductionOrderPostSecondaryPackagingPendingCancellationItemDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderPostSecondaryPackagingPendingCancellationItemsUpdateInput =
      {};
    if ('cancellation_quantity' in updateDto) {
      data.cancellation_quantity = this.normalizeRequiredQuantity(
        updateDto.cancellation_quantity,
        'cancellation_quantity',
      );
    }
    if ('cancellation_reason' in updateDto) {
      data.cancellation_reason = this.normalizeRequiredText(
        updateDto.cancellation_reason,
        'cancellation_reason',
      );
    }
    if ('cancellation_plan' in updateDto) {
      data.cancellation_plan = this.normalizeOptionalText(
        updateDto.cancellation_plan,
        'cancellation_plan',
      );
    }
    this.ensureUpdateHasFields(data);
    return data;
  }

  private normalizeRequiredQuantity(value: unknown, fieldName: string) {
    if (this.isEmpty(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    const normalized =
      typeof value === 'number'
        ? String(value)
        : typeof value === 'string'
          ? value.trim().replace(',', '.')
          : '';
    if (!DECIMAL_PATTERN.test(normalized)) {
      throw new BadRequestException(
        `${fieldName} must fit DECIMAL(12, 3) with up to 3 decimal places`,
      );
    }
    if (normalized.split('.')[0].length > DECIMAL_INTEGER_DIGITS) {
      throw new BadRequestException(`${fieldName} must fit DECIMAL(12, 3)`);
    }
    return new Prisma.Decimal(normalized);
  }

  private normalizeRequiredNonNegativeInt(value: unknown, fieldName: string) {
    if (this.isEmpty(value)) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    const normalized =
      typeof value === 'number' ? String(value) : String(value).trim();
    if (
      !/^\d+$/.test(normalized) ||
      !Number.isSafeInteger(Number(normalized))
    ) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }
    return Number(normalized);
  }

  private normalizeRequiredId(value: unknown, fieldName: string) {
    const normalized = this.normalizeRequiredNonNegativeInt(value, fieldName);
    if (normalized <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
    return normalized;
  }

  private normalizeRequiredText(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return value.trim();
  }

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (this.isEmpty(value)) return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }
    return value.trim();
  }

  private ensureDifferentOrders(
    productionOrderId: number,
    semiFinishedProductOrderId: number,
  ) {
    if (productionOrderId === semiFinishedProductOrderId) {
      throw new BadRequestException(
        'semi_finished_product_order_id must differ from production_order_id',
      );
    }
  }

  private ensureUpdateHasFields(data: object) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }
  }

  private isEmpty(value: unknown) {
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

  private async findSummaryValuesById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderPostSecondaryPackagingSummaries.findUnique(
        {
          where: { id: summaryId },
          select: { id: true, production_order_id: true },
        },
      );
    if (!summary) {
      throw new NotFoundException('Post-secondary packaging summary not found');
    }
    return summary;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return userId;
  }

  private throwIfSemiFinishedOrderAlreadyLinked(error: unknown): never | void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'Semi-finished product production order is already linked to another summary',
      );
    }
  }
}
