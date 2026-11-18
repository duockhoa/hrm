import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';
import { UpdateProductionOrderFinishedProductSummaryDto } from './dto/update-production-order-finished-product-summary.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetAuditLogPageDto } from '../audit-logs/dto/get-audit-log-page.dto';
import { GetFinishedProductSummariesDto } from './dto/get-finished-product-summaries.dto';
import { normalizeLotSearch } from './production-order-list-query';

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

const FINISHED_PRODUCT_SUMMARY_COUNT_FIELDS = [
  'package_count',
  'boxes_per_package',
  'loose_box_count',
] as const;

const pyclmSenderSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  department: true,
  position: true,
};

const finishedProductSummaryInclude = {
  warehouseConfirmedBy: {
    select: finishedProductSummaryCreatorSelect,
  },
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
      samplingRequests: {
        orderBy: {
          sent_at: 'desc',
        },
        take: 1,
        select: {
          id: true,
          status: true,
          google_doc_url: true,
          sent_at: true,
          location: true,
          sender: {
            select: pyclmSenderSelect,
          },
        },
      },
    },
  },
} satisfies Prisma.ProductionOrderFinishedProductSummariesInclude;

type FinishedProductSummaryListRow =
  Prisma.ProductionOrderFinishedProductSummariesGetPayload<{
    include: typeof finishedProductSummaryListInclude;
  }>;

const toFinishedProductSummaryListItem = (
  summary: FinishedProductSummaryListRow,
) => {
  const { samplingRequests, ...productionOrder } = summary.productionOrder;
  const latestSamplingRequest = samplingRequests[0] ?? null;
  return {
    ...summary,
    productionOrder: {
      ...productionOrder,
      pyclm: {
        isSent: latestSamplingRequest?.status === 'sent',
        status: latestSamplingRequest?.status ?? null,
        googleDocUrl: latestSamplingRequest?.google_doc_url ?? null,
        sentAt: latestSamplingRequest?.sent_at ?? null,
        location: latestSamplingRequest?.location ?? null,
        sender: latestSamplingRequest?.sender ?? null,
      },
    },
  };
};

@Injectable()
export class ProductionOrderFinishedProductSummariesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findHistory(summaryId: number, query: GetAuditLogPageDto) {
    // This scoped lookup must succeed before reading the shared audit table.
    await this.ensureSummaryExists(summaryId);
    return this.auditLogsService.findAll({
      entity_type: 'production_order_finished_product_summaries',
      entity_id: String(summaryId),
      page: query.page,
      limit: query.limit,
    });
  }

  async findAll(options: GetFinishedProductSummariesDto = {}) {
    const summaries =
      await this.prismaService.productionOrderFinishedProductSummaries.findMany(
        {
          include: finishedProductSummaryListInclude,
          orderBy: [
            {
              created_at: 'desc',
            },
            {
              id: 'desc',
            },
          ],
        },
      );

    const result = summaries.map(toFinishedProductSummaryListItem);

    const search = normalizeLotSearch(options.search).trim();
    if (!search) return result;

    // Search the same projection shown to users, including only the latest PYCLM.
    // Keeping this after projection avoids matching superseded sampling requests.
    return result.filter((summary) => {
      const order = summary.productionOrder;
      const creator = summary.createdBy;
      const sender = order.pyclm.sender;
      return [
        summary.id,
        summary.production_order_id,
        order.production_order_code,
        order.item_code,
        order.item?.item_code,
        order.item?.item_name,
        order.lot_no,
        order.pyclm.status,
        order.pyclm.isSent ? 'Đã gửi' : 'Chưa gửi',
        order.pyclm.location,
        sender?.name ?? sender?.username ?? sender?.email,
        creator?.name ?? creator?.username ?? creator?.email,
        creator?.department,
        summary.created_at.toISOString(),
      ].some((value) => normalizeLotSearch(value).includes(search));
    });
  }

  async findPage(options: GetFinishedProductSummariesDto) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    if (normalizeLotSearch(options.search).trim()) {
      // Filter computed fields (including latest PYCLM) before paging and counting.
      const matches = await this.findAll({ search: options.search });
      return {
        data: matches.slice(skip, skip + limit),
        total: matches.length,
        page,
        limit,
      };
    }

    const [rows, total] = await this.prismaService.$transaction(
      [
        this.prismaService.productionOrderFinishedProductSummaries.findMany({
          include: finishedProductSummaryListInclude,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),
        this.prismaService.productionOrderFinishedProductSummaries.count(),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: rows.map(toFinishedProductSummaryListItem),
      total,
      page,
      limit,
    };
  }

  async findById(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderFinishedProductSummaries.findUnique(
        {
          where: {
            id: summaryId,
          },
          include: finishedProductSummaryListInclude,
        },
      );

    if (!summary) {
      throw new NotFoundException('Finished product summary not found');
    }

    const { samplingRequests, ...productionOrder } = summary.productionOrder;
    const latestSamplingRequest = samplingRequests[0] ?? null;

    return {
      ...summary,
      productionOrder: {
        ...productionOrder,
        pyclm: {
          isSent: latestSamplingRequest?.status === 'sent',
          status: latestSamplingRequest?.status ?? null,
          googleDocUrl: latestSamplingRequest?.google_doc_url ?? null,
          sentAt: latestSamplingRequest?.sent_at ?? null,
          location: latestSamplingRequest?.location ?? null,
          sender: latestSamplingRequest?.sender ?? null,
        },
      },
    };
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
        note: this.normalizeOptionalText(dto?.note, 'note'),
        created_by_id: this.normalizeUserId(user),
      },
      include: finishedProductSummaryInclude,
    });
  }

  async update(
    summaryId: number,
    dto: UpdateProductionOrderFinishedProductSummaryDto,
  ) {
    await this.ensureSummaryExists(summaryId);

    if (dto?.reason !== undefined && dto.reason !== null) {
      if (typeof dto.reason !== 'string' || dto.reason.length > 2000) {
        throw new BadRequestException(
          'Lý do chỉnh sửa phải là chuỗi tối đa 2000 ký tự',
        );
      }
    }

    return this.prismaService.productionOrderFinishedProductSummaries.update({
      where: {
        id: summaryId,
      },
      data: this.normalizeUpdateData(dto),
      include: finishedProductSummaryInclude,
    });
  }

  async confirmWarehouse(summaryId: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    await this.ensureSummaryExists(summaryId);
    // Only the first confirmation wins, including concurrent requests/retries.
    await this.prismaService.productionOrderFinishedProductSummaries.updateMany({
      where: { id: summaryId, warehouse_confirmed_at: null },
      data: {
        warehouse_confirmed_by_id: userId,
        warehouse_confirmed_at: new Date(),
      },
    });
    return this.findById(summaryId);
  }

  async delete(summaryId: number) {
    await this.ensureSummaryExists(summaryId);

    return this.prismaService.productionOrderFinishedProductSummaries.delete({
      where: {
        id: summaryId,
      },
      include: finishedProductSummaryInclude,
    });
  }

  private normalizeUpdateData(
    dto: UpdateProductionOrderFinishedProductSummaryDto,
  ) {
    const updateDto = dto ?? {};
    const data: Prisma.ProductionOrderFinishedProductSummariesUpdateInput = {};

    for (const field of FINISHED_PRODUCT_SUMMARY_COUNT_FIELDS) {
      if (field in updateDto) {
        data[field] = this.normalizeRequiredNonNegativeInt(
          updateDto[field],
          field,
        );
      }
    }

    if ('note' in updateDto) {
      data.note = this.normalizeOptionalText(updateDto.note, 'note');
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

  private async ensureSummaryExists(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderFinishedProductSummaries.findUnique(
        {
          where: {
            id: summaryId,
          },
          select: {
            id: true,
          },
        },
      );

    if (!summary) {
      throw new NotFoundException('Finished product summary not found');
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

  private normalizeOptionalText(value: unknown, fieldName: string) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} must be a string`);
    }

    return value.trim();
  }

  private normalizeUserId(user?: AuthenticatedUser) {
    const userId = Number(user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }
}
