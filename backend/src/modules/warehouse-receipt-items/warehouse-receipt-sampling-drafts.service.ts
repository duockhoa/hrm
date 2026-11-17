import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { RecordListQueryDto } from '../../common/dto/record-list-query.dto';
import {
  literalContains,
  recordPagination,
  recordSearchTerms,
} from '../../common/utils/record-list-query';
import { SaveReceiptSamplingDraftDto } from './dto/save-receipt-sampling-draft.dto';
import { receiptSamplingSendActiveKey } from './warehouse-receipt-sampling-send.service';
import { FINISHED_PRODUCT_SAMPLING_SUPPLIER } from './sampling-request.constants';

@Injectable()
export class WarehouseReceiptSamplingDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async pendingTypes(userId: number) {
    this.requireUser(userId);
    const rows =
      await this.prisma.warehouseReceiptItemSamplingRequestDrafts.findMany({
        where: { created_by_id: userId },
        select: { request_type: true },
        distinct: ['request_type'],
      });
    return rows
      .map((row) => row.request_type)
      .filter((type) => type === 'NL' || type === 'TP');
  }

  async findAll(
    query: RecordListQueryDto,
    userId: number,
    requestType: 'NL' | 'TP' | 'ALL' = 'NL',
  ) {
    this.requireUser(userId);
    const pagination = recordPagination(query);
    const where: Prisma.WarehouseReceiptItemSamplingRequestDraftsWhereInput = {
      created_by_id: userId,
      ...(requestType === 'ALL' ? {} : { request_type: requestType }),
      ...(query.item_code ? { item_code: query.item_code } : {}),
      AND: recordSearchTerms(query.search).map((term) => ({
        OR: [
          'item_code',
          'item_name',
          'supplier_name',
          'lot_number',
          'location',
          'unit',
        ].map((field) => ({ [field]: literalContains(term) })),
      })),
    };
    const data =
      await this.prisma.warehouseReceiptItemSamplingRequestDrafts.findMany({
        where,
        ...pagination.args,
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      });
    const records = data.map((draft) =>
      draft.request_type === 'TP'
        ? { ...draft, supplier_name: FINISHED_PRODUCT_SAMPLING_SUPPLIER }
        : draft,
    );
    if (!pagination.enabled) return records;
    const total =
      await this.prisma.warehouseReceiptItemSamplingRequestDrafts.count({
        where,
      });
    return {
      data: records,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findByReceipt(receiptId: number, userId: number) {
    this.requireUser(userId);
    const receipt = await this.prisma.warehouseReceiptItems.findUnique({
      where: { id: receiptId },
      select: { id: true },
    });
    if (!receipt)
      throw new NotFoundException('Warehouse receipt item not found');
    return this.prisma.warehouseReceiptItemSamplingRequestDrafts.findFirst({
      where: {
        warehouse_receipt_item_id: receiptId,
        created_by_id: userId,
        request_type: 'NL',
      },
    });
  }

  async save(
    receiptId: number,
    dto: SaveReceiptSamplingDraftDto,
    userId: number,
  ) {
    this.requireUser(userId);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM warehouse_receipt_item_sampling_request_drafts WHERE warehouse_receipt_item_id = ${receiptId} FOR UPDATE`;
        const activeSend =
          await tx.warehouseReceiptSamplingSendBatches.findUnique({
            where: { active_key: receiptSamplingSendActiveKey(userId) },
          });
        if (activeSend)
          throw new ConflictException(
            'Đang xử lý đợt gửi PYCLM. Vui lòng chờ trước khi sửa bản nháp.',
          );
        const existingDraft =
          await tx.warehouseReceiptItemSamplingRequestDrafts.findUnique({
            where: { warehouse_receipt_item_id: receiptId },
          });
        if (existingDraft && existingDraft.created_by_id !== userId) {
          throw new ForbiddenException(
            'Bạn không thể sửa bản nháp của người dùng khác.',
          );
        }
        const receipt = await tx.warehouseReceiptItems.findUnique({
          where: { id: receiptId },
          select: {
            id: true,
            item_code: true,
            quantity: true,
            unit: true,
            lot_number: true,
            expiry_date: true,
            supplier_name: true,
            item: { select: { item_name: true } },
            supplier: { select: { card_name: true } },
            samplingRequest: { select: { id: true } },
          },
        });
        if (!receipt)
          throw new NotFoundException('Warehouse receipt item not found');
        if (receipt.samplingRequest)
          throw new ConflictException('Phiếu yêu cầu lấy mẫu đã được gửi.');

        // Copy the receipt on the server so submitted item/lot data cannot be forged.
        const data = {
          item_code: receipt.item_code,
          item_name: receipt.item?.item_name ?? null,
          quantity: receipt.quantity,
          unit: receipt.unit,
          supplier_name: receipt.supplier?.card_name ?? receipt.supplier_name,
          lot_number: receipt.lot_number,
          expiry_date: receipt.expiry_date,
          location: dto.location.trim(),
        };
        const where = {
          warehouse_receipt_item_id: receiptId,
          created_by_id: userId,
        };
        if (existingDraft)
          return tx.warehouseReceiptItemSamplingRequestDrafts.update({
            where,
            data,
          });
        try {
          return await tx.warehouseReceiptItemSamplingRequestDrafts.create({
            data: {
              warehouse_receipt_item_id: receiptId,
              created_by_id: userId,
              ...data,
            },
          });
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== 'P2002'
          )
            throw error;
          // Another user may create the unique receipt draft concurrently.
          // Never update that user's row as an upsert's fallback would do.
          const winner =
            await tx.warehouseReceiptItemSamplingRequestDrafts.findUnique({
              where: { warehouse_receipt_item_id: receiptId },
            });
          if (winner?.created_by_id !== userId)
            throw new ForbiddenException(
              'Bạn không thể sửa bản nháp của người dùng khác.',
            );
          return tx.warehouseReceiptItemSamplingRequestDrafts.update({
            where,
            data,
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private requireUser(userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw new UnauthorizedException();
  }

  async findByProductionOrder(productionOrderId: number, userId: number) {
    this.requireUser(userId);
    const order = await this.prisma.productionOrders.findUnique({
      where: { id: productionOrderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Production order not found');
    return this.prisma.warehouseReceiptItemSamplingRequestDrafts.findFirst({
      where: {
        production_order_id: productionOrderId,
        created_by_id: userId,
        request_type: 'TP',
      },
    });
  }

  async saveProductionOrder(
    productionOrderId: number,
    dto: SaveReceiptSamplingDraftDto,
    userId: number,
  ) {
    this.requireUser(userId);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM warehouse_receipt_item_sampling_request_drafts WHERE production_order_id = ${productionOrderId} FOR UPDATE`;
        const active = await tx.warehouseReceiptSamplingSendBatches.findUnique({
          where: { active_key: receiptSamplingSendActiveKey(userId, 'TP') },
        });
        if (active)
          throw new ConflictException(
            'Đang xử lý đợt gửi PYCLM thành phẩm. Vui lòng chờ hoàn tất.',
          );
        const existing =
          await tx.warehouseReceiptItemSamplingRequestDrafts.findUnique({
            where: { production_order_id: productionOrderId },
          });
        if (existing && existing.created_by_id !== userId)
          throw new ForbiddenException(
            'Bạn không thể sửa bản nháp của người dùng khác.',
          );
        const order = await tx.productionOrders.findUnique({
          where: { id: productionOrderId },
          include: {
            item: true,
            finishedProductSummaries: { select: { id: true }, take: 1 },
          },
        });
        if (!order) throw new NotFoundException('Production order not found');
        if (
          !order.item_code.startsWith('TP') ||
          !order.finishedProductSummaries.length
        )
          throw new BadRequestException(
            'Chỉ soạn PYCLM từ lô có tổng kết thành phẩm.',
          );
        const parsedExpiry =
          order.expire_date && /^\d{4}-\d{2}-\d{2}/.test(order.expire_date)
            ? new Date(`${order.expire_date.slice(0, 10)}T00:00:00.000Z`)
            : null;
        const data = {
          request_type: 'TP',
          item_code: order.item_code,
          item_name: order.item?.item_name ?? order.description,
          quantity: new Prisma.Decimal(order.planned_quatity),
          unit: order.unit,
          supplier_name: FINISHED_PRODUCT_SAMPLING_SUPPLIER,
          lot_number: order.lot_no,
          expiry_date:
            parsedExpiry && !Number.isNaN(parsedExpiry.getTime())
              ? parsedExpiry
              : null,
          expiry_date_text: order.expire_date,
          location: dto.location.trim(),
        };
        const where = {
          production_order_id: productionOrderId,
          created_by_id: userId,
        };
        if (existing)
          return tx.warehouseReceiptItemSamplingRequestDrafts.update({
            where,
            data,
          });
        try {
          return await tx.warehouseReceiptItemSamplingRequestDrafts.create({
            data: {
              ...data,
              production_order_id: productionOrderId,
              created_by_id: userId,
            },
          });
        } catch (error) {
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== 'P2002'
          )
            throw error;
          const winner =
            await tx.warehouseReceiptItemSamplingRequestDrafts.findUnique({
              where: { production_order_id: productionOrderId },
            });
          if (winner?.created_by_id !== userId)
            throw new ForbiddenException(
              'Bạn không thể sửa bản nháp của người dùng khác.',
            );
          return tx.warehouseReceiptItemSamplingRequestDrafts.update({
            where,
            data,
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
