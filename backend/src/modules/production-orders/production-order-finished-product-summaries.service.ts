import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type SapProductionReceiptRequests } from '@prisma/client';
import { isAxiosError } from 'axios';
import { createHash } from 'node:crypto';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderFinishedProductSummaryDto } from './dto/create-production-order-finished-product-summary.dto';
import { UpdateProductionOrderFinishedProductSummaryDto } from './dto/update-production-order-finished-product-summary.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetAuditLogPageDto } from '../audit-logs/dto/get-audit-log-page.dto';
import { GetFinishedProductSummariesDto } from './dto/get-finished-product-summaries.dto';
import { normalizeLotSearch } from './production-order-list-query';
import { SapB1ServiceLayerClient } from '../sap-b1-connector/sap-b1-service-layer.client';
import type { SapProductionReceipt } from '../sap-b1-connector/sap-production-receipt';
import { SAP_PRODUCTION_ORDER_BASE_TYPE } from '../sap-b1-connector/sap-production-receipt';
import { CreateSapProductionReceiptDto } from './dto/create-sap-production-receipt.dto';

function sapReceiptReference(requestId: string) {
  const hash = createHash('sha256').update(requestId).digest();
  return `W${hash.readUIntBE(0, 6).toString(36).padStart(10, '0').toUpperCase()}`;
}

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
      warehouse: true,
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
    private readonly sapB1Client: SapB1ServiceLayerClient,
  ) {}

  private async findSapReceiptOrder(summaryId: number) {
    const summary =
      await this.prismaService.productionOrderFinishedProductSummaries.findUnique(
        {
          where: { id: summaryId },
          select: {
            productionOrder: {
              select: {
                id: true,
                item_code: true,
                lot_no: true,
                production_order_code: true,
              },
            },
          },
        },
      );
    if (!summary) {
      throw new NotFoundException('Không tìm thấy tổng kết thành phẩm');
    }
    return summary.productionOrder;
  }

  async findSapProductionReceipts(summaryId: number) {
    const order = await this.findSapReceiptOrder(summaryId);
    let receipts: SapProductionReceipt[] | null;
    try {
      receipts = await this.sapB1Client.getProductionReceipts(order);
    } catch {
      throw new BadGatewayException('Không thể đọc phiếu nhập kho từ SAP');
    }
    if (receipts === null) {
      throw new NotFoundException(
        'Không tìm thấy lệnh sản xuất tương ứng trên SAP',
      );
    }
    return receipts;
  }

  async createSapProductionReceipt(
    summaryId: number,
    dto: CreateSapProductionReceiptDto,
  ) {
    const order = await this.findSapReceiptOrder(summaryId);
    const {
      requestId,
      postingDate,
      quantity,
      warehouseCode,
      lotNumber,
      manufacturingDate,
      expiryDate,
      comments,
    } = dto;
    const departmentCode = dto.departmentCode ?? 'KHKV';
    const costItemCode = dto.costItemCode ?? 'CP004';
    if (new Prisma.Decimal(quantity).decimalPlaces() > 6) {
      throw new BadRequestException(
        'Số lượng chỉ được có tối đa 6 chữ số thập phân.',
      );
    }
    if (expiryDate < manufacturingDate) {
      throw new BadRequestException(
        'Hạn sử dụng phải từ ngày sản xuất trở đi.',
      );
    }
    const payloadHash = createHash('sha256')
      .update(
        JSON.stringify([
          postingDate,
          quantity,
          warehouseCode,
          lotNumber,
          manufacturingDate,
          expiryDate,
          comments ?? '',
          // Preserve the request hash for drafts saved before costing fields were added.
          ...(dto.departmentCode != null || dto.costItemCode != null
            ? [departmentCode, costItemCode]
            : []),
        ]),
      )
      .digest('hex');
    const requests = this.prismaService.sapProductionReceiptRequests;
    const where = { request_id: requestId.toLowerCase() };
    const activeWhere = { active_summary_id: summaryId };
    const existing = await requests.findUnique({ where });
    if (existing)
      return this.recoverSapProductionReceipt(existing, summaryId, payloadHash);

    const active = await requests.findUnique({ where: activeWhere });
    if (active)
      return this.rejectDuplicateSapProductionReceipt(active, summaryId);

    let entry: number | null;
    let tracking: Awaited<
      ReturnType<SapB1ServiceLayerClient['getReceiptItemTracking']>
    >;
    let distributionRules: Awaited<
      ReturnType<
        SapB1ServiceLayerClient['getProductionReceiptDistributionRules']
      >
    >;
    try {
      [entry, tracking, distributionRules] = await Promise.all([
        this.sapB1Client.resolveProductionOrderEntry(order),
        this.sapB1Client.getReceiptItemTracking(order.item_code),
        this.sapB1Client.getProductionReceiptDistributionRules(
          departmentCode,
          costItemCode,
        ),
      ]);
    } catch {
      throw new BadGatewayException(
        'Không thể kiểm tra lệnh, mặt hàng hoặc mã phân bổ trên SAP.',
      );
    }
    if (entry === null) {
      throw new NotFoundException(
        'Không tìm thấy lệnh sản xuất tương ứng trên SAP.',
      );
    }
    if (tracking.ManageSerialNumbers === 'tYES') {
      throw new UnprocessableEntityException(
        'Mặt hàng quản lý theo số sê-ri cần được nhập trực tiếp trên SAP.',
      );
    }
    if (
      tracking.ManageBatchNumbers !== 'tYES' &&
      tracking.ManageBatchNumbers !== 'tNO'
    ) {
      throw new BadGatewayException(
        'SAP chưa trả về thông tin quản lý lô của mặt hàng.',
      );
    }
    const hasActiveRule = (code: string, dimension: number) =>
      distributionRules.some(
        (rule) =>
          rule.FactorCode === code &&
          rule.InWhichDimension === dimension &&
          rule.Active === 'tYES',
      );
    if (!hasActiveRule(departmentCode, 1)) {
      throw new UnprocessableEntityException(
        `Mã Phòng ban - Bộ phận ${departmentCode} không hợp lệ hoặc chưa được kích hoạt trên SAP.`,
      );
    }
    if (!hasActiveRule(costItemCode, 2)) {
      throw new UnprocessableEntityException(
        `Mã Khoản mục chi phí ${costItemCode} không hợp lệ hoặc chưa được kích hoạt trên SAP.`,
      );
    }

    let request: SapProductionReceiptRequests;
    try {
      request = await requests.create({
        data: {
          ...where,
          summary_id: summaryId,
          active_summary_id: summaryId,
          payload_hash: payloadHash,
          sap_order_entry: entry,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const concurrent = await requests.findUnique({ where });
      if (concurrent) {
        return this.recoverSapProductionReceipt(
          concurrent,
          summaryId,
          payloadHash,
        );
      }
      const winner = await requests.findUnique({ where: activeWhere });
      if (winner)
        return this.rejectDuplicateSapProductionReceipt(winner, summaryId);
      throw new ConflictException(
        'Yêu cầu nhập kho vừa thay đổi. Vui lòng thử lại.',
      );
    }

    const reference = sapReceiptReference(request.request_id);
    let receipt: { DocEntry: number; DocNum: number };
    try {
      receipt = await this.sapB1Client.postProductionReceipt({
        DocDate: postingDate,
        JournalMemo: 'Nhập kho sản xuất',
        Reference2: reference,
        Comments: comments || undefined,
        DocumentLines: [
          {
            BaseType: SAP_PRODUCTION_ORDER_BASE_TYPE,
            BaseEntry: entry,
            Quantity: quantity,
            WarehouseCode: warehouseCode,
            CostingCode: departmentCode,
            CostingCode2: costItemCode,
            U_SL: lotNumber,
            U_NSX: manufacturingDate,
            U_HSD: expiryDate,
            BatchNumbers:
              tracking.ManageBatchNumbers === 'tYES'
                ? [
                    {
                      BatchNumber: lotNumber,
                      Quantity: quantity,
                      ManufacturingDate: manufacturingDate,
                      ExpiryDate: expiryDate,
                    },
                  ]
                : undefined,
          },
        ],
      });
    } catch (error) {
      if (
        isAxiosError(error) &&
        [400, 422].includes(error.response?.status ?? 0)
      ) {
        const sapError: unknown = error.response?.data?.error?.message;
        const message: unknown =
          typeof sapError === 'object' &&
          sapError !== null &&
          'value' in sapError
            ? sapError.value
            : sapError;
        if (typeof message === 'string' && message.trim()) {
          await requests.delete({ where: { id: request.id } });
          throw new UnprocessableEntityException(message.trim().slice(0, 400));
        }
      }
      return this.recoverSapProductionReceipt(request, summaryId, payloadHash);
    }
    return this.recordSapProductionReceipt(request.id, receipt);
  }

  private async rejectDuplicateSapProductionReceipt(
    active: SapProductionReceiptRequests,
    summaryId: number,
  ): Promise<never> {
    const receipt = await this.recoverSapProductionReceipt(
      active,
      summaryId,
      active.payload_hash,
    ).catch((error: unknown) => {
      if (error instanceof ServiceUnavailableException) {
        throw new ConflictException(
          'Bản tổng kết đang chờ kết quả nhập kho từ SAP.',
        );
      }
      throw error;
    });
    throw new ConflictException(
      `Bản tổng kết đã nhập kho từ WMS qua phiếu SAP #${receipt.DocNum}.`,
    );
  }

  private async recoverSapProductionReceipt(
    request: SapProductionReceiptRequests,
    summaryId: number,
    payloadHash: string,
  ) {
    if (
      request.summary_id !== summaryId ||
      request.payload_hash !== payloadHash
    ) {
      throw new ConflictException('Mã yêu cầu đã được dùng cho dữ liệu khác.');
    }
    if (request.sap_doc_entry !== null && request.sap_doc_num !== null) {
      return { DocEntry: request.sap_doc_entry, DocNum: request.sap_doc_num };
    }
    const reference = sapReceiptReference(request.request_id);
    const receipts = await this.sapB1Client
      .getProductionReceiptsForEntry(request.sap_order_entry, reference)
      .catch((): SapProductionReceipt[] => []);
    const matches = receipts.filter(
      (receipt) => receipt.Reference2 === reference,
    );
    if (matches.length !== 1) {
      throw new ServiceUnavailableException(
        `Chưa xác nhận được kết quả trên SAP. Hãy bấm Kiểm tra kết quả. Mã tham chiếu: ${reference}.`,
      );
    }
    return this.recordSapProductionReceipt(request.id, matches[0]);
  }

  private async recordSapProductionReceipt(
    requestId: number,
    receipt: { DocEntry: number; DocNum: number },
  ) {
    await this.prismaService.sapProductionReceiptRequests.update({
      where: { id: requestId },
      data: { sap_doc_entry: receipt.DocEntry, sap_doc_num: receipt.DocNum },
    });
    return { DocEntry: receipt.DocEntry, DocNum: receipt.DocNum };
  }

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
          include: {
            ...finishedProductSummaryListInclude,
            sapProductionReceiptRequests: {
              where: { active_summary_id: summaryId },
              select: { sap_doc_num: true },
              take: 1,
            },
          },
        },
      );

    if (!summary) {
      throw new NotFoundException('Finished product summary not found');
    }

    const { sapProductionReceiptRequests = [], ...summaryData } = summary;
    const { samplingRequests, ...productionOrder } = summary.productionOrder;
    const latestSamplingRequest = samplingRequests[0] ?? null;

    return {
      ...summaryData,
      sap_production_receipt_number:
        sapProductionReceiptRequests[0]?.sap_doc_num ?? null,
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

    const data = this.normalizeUpdateData(dto);
    return this.writeUnconfirmedSummary(summaryId, (where) =>
      this.prismaService.productionOrderFinishedProductSummaries.update({
        where,
        data,
        include: finishedProductSummaryInclude,
      }),
    );
  }

  async confirmWarehouse(summaryId: number, user?: AuthenticatedUser) {
    const userId = this.normalizeUserId(user);
    await this.ensureSummaryExists(summaryId);
    // Only the first confirmation wins, including concurrent requests/retries.
    await this.prismaService.productionOrderFinishedProductSummaries.updateMany(
      {
        where: { id: summaryId, warehouse_confirmed_at: null },
        data: {
          warehouse_confirmed_by_id: userId,
          warehouse_confirmed_at: new Date(),
        },
      },
    );
    return this.findById(summaryId);
  }

  async delete(summaryId: number) {
    return this.writeUnconfirmedSummary(summaryId, (where) =>
      this.prismaService.productionOrderFinishedProductSummaries.delete({
        where,
        include: finishedProductSummaryInclude,
      }),
    );
  }

  private async writeUnconfirmedSummary<T>(
    summaryId: number,
    write: (where: { id: number; warehouse_confirmed_at: null }) => Promise<T>,
  ) {
    try {
      // Check confirmation in the write so a concurrent confirmation locks the record.
      return await write({ id: summaryId, warehouse_confirmed_at: null });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2025'
      ) {
        throw error;
      }
      await this.ensureSummaryExists(summaryId);
      throw new ConflictException(
        'Kho đã xác nhận tổng kết thành phẩm. Không thể sửa hoặc xóa.',
      );
    }
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
