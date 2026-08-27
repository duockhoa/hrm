import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';

type AuthenticatedUser = {
  id?: number | string | null;
};

const finishedProductSummaryCreatorSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const finishedProductSummaryInclude = {
  createdBy: {
    select: finishedProductSummaryCreatorSelect,
  },
} satisfies Prisma.ProductionOrderFinishedProductSummariesInclude;

const finishedProductSummaryListInclude = {
  ...finishedProductSummaryInclude,
  productionOrder: {
    select: {
      id: true,
      item_code: true,
      production_order_code: true,
      status: true,
      type: true,
      planned_quatity: true,
      unit: true,
      lot_no: true,
      date_manufacture: true,
      expire_date: true,
      item: {
        select: {
          item_code: true,
          item_name: true,
          unit: true,
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderFinishedProductSummariesInclude;

@Injectable()
export class ProductionOrderFinishedProductSummariesService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll() {
    return this.prismaService.productionOrderFinishedProductSummaries.findMany({
      include: finishedProductSummaryListInclude,
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

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderFinishedProductSummaries.findUnique(
        {
          where: {
            id: summaryId,
          },
          include: finishedProductSummaryInclude,
        },
      );

    if (!summary) {
      throw new NotFoundException('Finished product summary not found');
    }

    return summary;
  }

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderFinishedProductSummaries.findMany({
      where: {
        production_order_id: productionOrderId,
      },
      include: finishedProductSummaryInclude,
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
    dto: CreateProductionOrderFinishedProductSummaryDto,
    user?: AuthenticatedUser,
  ) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderFinishedProductSummaries.create({
      data: {
        production_order_id: productionOrderId,
        package_count: this.normalizeRequiredNonNegativeInt(
          dto?.package_count,
          'package_count',
        ),
        boxes_per_package: this.normalizeRequiredNonNegativeInt(
          dto?.boxes_per_package,
          'boxes_per_package',
        ),
        loose_box_count: this.normalizeRequiredNonNegativeInt(
          dto?.loose_box_count,
          'loose_box_count',
        ),
        created_by_id: this.normalizeUserId(user),
      },
      include: finishedProductSummaryInclude,
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

  private normalizeRequiredNonNegativeInt(value: unknown, fieldName: string) {
    if (value === null || value === undefined) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    const normalizedValue =
      typeof value === 'number' ? String(value) : String(value).trim();

    if (normalizedValue === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (!/^\d+$/.test(normalizedValue)) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    const numberValue = Number(normalizedValue);

    if (
      !Number.isSafeInteger(numberValue) ||
      String(numberValue) !== normalizedValue.replace(/^0+(?=\d)/, '')
    ) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    return numberValue;
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
