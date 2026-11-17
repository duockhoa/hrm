import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
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

@Injectable()
export class WarehouseReceiptSamplingDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RecordListQueryDto, userId: number) {
    this.requireUser(userId);
    const pagination = recordPagination(query);
    const where: Prisma.WarehouseReceiptItemSamplingRequestDraftsWhereInput = {
      created_by_id: userId,
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
    if (!pagination.enabled) return data;
    const total =
      await this.prisma.warehouseReceiptItemSamplingRequestDrafts.count({
        where,
      });
    return { data, total, page: pagination.page, limit: pagination.limit };
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
      where: { warehouse_receipt_item_id: receiptId, created_by_id: userId },
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
}
