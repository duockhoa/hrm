import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, WarehouseReceiptSamplingSendBatches } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/prisma.service';
import { EmailSettingsService } from '../email-settings/email-settings.service';
import { EMAIL_TYPE_CODES } from '../email-settings/constants/email-settings.constants';

export const RECEIPT_SAMPLING_SEND_ACTIVE_KEY = 'warehouse-receipt-sampling';
const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxeK_4cJNcud6brpFrzHoQUGjiGnpcBsoaSO6stZxSE0xrnqndFCnowCkHL5RJWd6rE/exec';
type Snapshot = { id: number; receiptId: number; location: string };

function snapshotOf(batch: WarehouseReceiptSamplingSendBatches): Snapshot[] {
  return batch.draft_snapshot as unknown as Snapshot[];
}

@Injectable()
export class WarehouseReceiptSamplingSendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSettings: EmailSettingsService,
  ) {}

  async send(requestId: string, userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw new UnauthorizedException();
    const existing =
      await this.prisma.warehouseReceiptSamplingSendBatches.findUnique({
        where: { id: requestId },
      });
    if (existing) {
      if (existing.sender_id !== userId)
        throw new ConflictException('Mã đợt gửi đã được sử dụng.');
      if (existing.status === 'completed') return this.result(existing);
      if (existing.status === 'confirmed') return this.finalize(existing);
      throw new ConflictException({
        message:
          existing.status === 'failed'
            ? 'Đợt gửi trước đã thất bại. Vui lòng bắt đầu đợt gửi mới.'
            : 'Đợt gửi đang xử lý hoặc chưa xác định được kết quả. Cần kiểm tra email trước khi gửi lại.',
        sendState: existing.status,
        requestId,
      });
    }
    const sender = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true },
    });
    if (!sender) throw new UnauthorizedException();
    const recipients = await this.emailSettings.resolveRecipients(
      EMAIL_TYPE_CODES.SAMPLING_REQUEST,
      userId,
    );
    if (!recipients.length)
      throw new BadRequestException('Chưa có email người nhận PYCLM.');

    let batch: WarehouseReceiptSamplingSendBatches;
    try {
      batch = await this.prisma.$transaction(
        async (tx) => {
          // Snapshot every draft, independent of the current search or loaded UI pages.
          await tx.$queryRaw`SELECT id FROM warehouse_receipt_item_sampling_request_drafts ORDER BY id FOR UPDATE`;
          const drafts =
            await tx.warehouseReceiptItemSamplingRequestDrafts.findMany({
              orderBy: { id: 'asc' },
              include: {
                receipt: {
                  select: { samplingRequest: { select: { id: true } } },
                },
              },
            });
          if (!drafts.length)
            throw new BadRequestException('Không có bản nháp PYCLM để gửi.');
          for (const draft of drafts) {
            if (draft.receipt.samplingRequest)
              throw new ConflictException(
                `Bản ghi kiểm hàng #${draft.warehouse_receipt_item_id} đã gửi PYCLM.`,
              );
            if (
              !draft.item_code?.trim() ||
              !draft.item_name?.trim() ||
              !draft.lot_number?.trim() ||
              !draft.location?.trim() ||
              !draft.quantity ||
              draft.quantity.lte(0)
            ) {
              throw new BadRequestException(
                `Bản nháp #${draft.id} chưa đủ mã hàng, tên hàng, số lượng, số lô hoặc vị trí lấy mẫu.`,
              );
            }
          }
          const payload = {
            requester:
              sender.name?.trim() ||
              sender.username ||
              sender.email ||
              String(sender.id),
            type: 'NL',
            recipients,
            materials: drafts.map((draft) => ({
              materialCode: draft.item_code!,
              sampleName: draft.item_name!,
              quantity: [draft.quantity!.toString(), draft.unit]
                .filter(Boolean)
                .join(' '),
              supplier: draft.supplier_name ?? '',
              lotNumber: draft.lot_number!,
              expiryDate: draft.expiry_date
                ? draft.expiry_date
                    .toISOString()
                    .slice(0, 10)
                    .split('-')
                    .reverse()
                    .join('/')
                : '',
              samplingLocation: draft.location!.trim(),
            })),
          };
          return tx.warehouseReceiptSamplingSendBatches.create({
            data: {
              id: requestId,
              active_key: RECEIPT_SAMPLING_SEND_ACTIVE_KEY,
              status: 'sending',
              sender_id: userId,
              payload,
              draft_snapshot: drafts.map((draft) => ({
                id: draft.id,
                receiptId: draft.warehouse_receipt_item_id,
                location: draft.location!.trim(),
              })),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Đang có một đợt gửi PYCLM khác. Vui lòng chờ hoàn tất.',
        );
      throw error;
    }

    let response: unknown;
    try {
      response = (
        await axios.post<unknown>(
          process.env.WAREHOUSE_PYCLM_API_URL?.trim() || DEFAULT_SCRIPT_URL,
          batch.payload,
          {
            timeout: 120000,
            maxRedirects: 5,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      ).data;
    } catch {
      return this.markUncertain(batch.id);
    }
    if (
      !response ||
      typeof response !== 'object' ||
      !('success' in response) ||
      typeof response.success !== 'boolean'
    )
      return this.markUncertain(batch.id);
    if (!response.success) {
      const providerError =
        'error' in response && typeof response.error === 'string'
          ? response.error.slice(0, 5000)
          : 'Apps Script báo gửi thất bại.';
      await this.prisma.warehouseReceiptSamplingSendBatches.update({
        where: { id: batch.id },
        data: { status: 'failed', active_key: null, last_error: providerError },
      });
      throw new BadGatewayException({
        message: `Không thể gửi PYCLM: ${providerError}`,
        sendState: 'failed',
        requestId,
      });
    }
    const data =
      'data' in response && response.data && typeof response.data === 'object'
        ? response.data
        : null;
    const returnedUrl =
      data && 'url' in data && typeof data.url === 'string'
        ? data.url.trim()
        : '';
    let url: string | null = null;
    try {
      const parsed = new URL(returnedUrl);
      if (
        parsed.protocol === 'https:' &&
        (parsed.hostname === 'google.com' ||
          parsed.hostname.endsWith('.google.com'))
      )
        url = parsed.href;
    } catch {
      /* A confirmed email can be saved without a document URL. */
    }
    try {
      batch = await this.prisma.warehouseReceiptSamplingSendBatches.update({
        where: { id: batch.id },
        data: {
          status: 'confirmed',
          google_doc_url: url,
          sent_at: new Date(),
        },
      });
    } catch {
      throw new ServiceUnavailableException({
        message:
          'Google đã xác nhận gửi nhưng chưa lưu được kết quả. Cần kiểm tra đợt gửi trước khi gửi lại.',
        sendState: 'uncertain',
        requestId,
      });
    }
    return this.finalize(batch);
  }

  private async markUncertain(requestId: string): Promise<never> {
    await this.prisma.warehouseReceiptSamplingSendBatches.update({
      where: { id: requestId },
      data: {
        status: 'uncertain',
        last_error: 'No definitive Apps Script confirmation.',
      },
    });
    throw new BadGatewayException({
      message:
        'Chưa xác nhận được Google đã gửi email hay chưa. Bản nháp được giữ lại; cần kiểm tra email trước khi gửi lại.',
      sendState: 'uncertain',
      requestId,
    });
  }

  private async finalize(batch: WarehouseReceiptSamplingSendBatches) {
    try {
      const completed = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM warehouse_receipt_sampling_send_batches WHERE id = ${batch.id} FOR UPDATE`;
          const current =
            await tx.warehouseReceiptSamplingSendBatches.findUniqueOrThrow({
              where: { id: batch.id },
            });
          if (current.status === 'completed') return current;
          if (current.status !== 'confirmed' || !current.sent_at)
            throw new Error('Send batch is not confirmed');
          const snapshot = snapshotOf(current);
          await tx.warehouseReceiptItemSamplingRequests.createMany({
            data: snapshot.map((draft) => ({
              warehouse_receipt_item_id: draft.receiptId,
              location: draft.location,
              sender_id: current.sender_id,
              sent_at: current.sent_at!,
              google_doc_url: current.google_doc_url,
            })),
          });
          // Do not delete drafts created after this email's snapshot.
          await tx.warehouseReceiptItemSamplingRequestDrafts.deleteMany({
            where: { id: { in: snapshot.map((draft) => draft.id) } },
          });
          return tx.warehouseReceiptSamplingSendBatches.update({
            where: { id: current.id },
            data: { status: 'completed', active_key: null },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
      return this.result(completed);
    } catch {
      throw new ServiceUnavailableException({
        message:
          'Email đã được gửi nhưng chưa hoàn tất lưu dữ liệu. Bấm gửi lại để hoàn tất lưu, ứng dụng sẽ không gửi lại email.',
        sendState: 'confirmed',
        requestId: batch.id,
      });
    }
  }

  private result(batch: WarehouseReceiptSamplingSendBatches) {
    return {
      status: 'success',
      requestId: batch.id,
      sentCount: snapshotOf(batch).length,
      googleDocUrl: batch.google_doc_url,
    };
  }
}
