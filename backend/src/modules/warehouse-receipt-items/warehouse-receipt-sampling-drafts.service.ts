import {
  ConflictException,
  Injectable,
  NotFoundException,
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
import { RECEIPT_SAMPLING_SEND_ACTIVE_KEY } from './warehouse-receipt-sampling-send.service';

@Injectable()
export class WarehouseReceiptSamplingDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RecordListQueryDto = {}) {
    const pagination = recordPagination(query);
    const where: Prisma.WarehouseReceiptItemSamplingRequestDraftsWhereInput = {
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

  async findByReceipt(receiptId: number) {
    const receipt = await this.prisma.warehouseReceiptItems.findUnique({
      where: { id: receiptId },
      select: { id: true },
    });
    if (!receipt)
      throw new NotFoundException('Warehouse receipt item not found');
    return this.prisma.warehouseReceiptItemSamplingRequestDrafts.findUnique({
      where: { warehouse_receipt_item_id: receiptId },
    });
  }

  async save(receiptId: number, dto: SaveReceiptSamplingDraftDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM warehouse_receipt_item_sampling_request_drafts WHERE warehouse_receipt_item_id = ${receiptId} FOR UPDATE`;
        const activeSend =
          await tx.warehouseReceiptSamplingSendBatches.findUnique({
            where: { active_key: RECEIPT_SAMPLING_SEND_ACTIVE_KEY },
          });
        if (activeSend)
          throw new ConflictException(
            'Đang xử lý đợt gửi PYCLM. Vui lòng chờ trước khi sửa bản nháp.',
          );
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
        return tx.warehouseReceiptItemSamplingRequestDrafts.upsert({
          where: { warehouse_receipt_item_id: receiptId },
          create: { warehouse_receipt_item_id: receiptId, ...data },
          update: data,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
