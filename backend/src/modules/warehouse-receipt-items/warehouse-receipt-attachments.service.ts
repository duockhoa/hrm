import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  MAX_RECEIPT_ATTACHMENT_FILES,
  RECEIPT_ATTACHMENT_TYPES,
  RECEIPT_ATTACHMENT_ROUTE,
  removeReceiptAttachments,
  resolveReceiptAttachmentFile,
  storeReceiptAttachment,
  validateReceiptAttachment,
} from './receipt-attachment-files';

export const receiptAttachmentInclude = {
  uploadedBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.WarehouseReceiptItemAttachmentsInclude;

@Injectable()
export class WarehouseReceiptAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(receiptId: number, type?: string) {
    await this.ensureReceipt(receiptId);
    if (type !== undefined) this.validateType(type);
    return this.prisma.warehouseReceiptItemAttachments.findMany({
      where: {
        warehouse_receipt_item_id: receiptId,
        ...(type === undefined ? {} : { attachment_type: type }),
      },
      include: receiptAttachmentInclude,
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(receiptId: number, attachmentId: number) {
    this.validateId(receiptId);
    this.validateId(attachmentId);
    const attachment =
      await this.prisma.warehouseReceiptItemAttachments.findFirst({
        where: { id: attachmentId, warehouse_receipt_item_id: receiptId },
        include: receiptAttachmentInclude,
      });
    if (!attachment)
      throw new NotFoundException('Receipt attachment not found');
    return attachment;
  }

  async upload(
    receiptId: number,
    body: unknown,
    files: Express.Multer.File[] | undefined,
    user?: { id?: number | string | null },
  ) {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => key !== 'attachment_type')
    ) {
      throw new BadRequestException(
        'Only attachment_type is allowed in the upload body',
      );
    }
    const type = (body as { attachment_type?: unknown }).attachment_type;
    this.validateType(type);
    if (!files?.length || files.length > MAX_RECEIPT_ATTACHMENT_FILES) {
      throw new BadRequestException('Upload between 1 and 10 images');
    }
    const userId = Number(user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0 || userId > 2147483647) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    await this.ensureReceipt(receiptId);
    const uploader = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true },
    });
    if (!uploader)
      throw new UnauthorizedException('Authenticated user not found');
    for (const file of files) await validateReceiptAttachment(file);
    const filePaths: string[] = [];
    try {
      for (const file of files)
        filePaths.push(await storeReceiptAttachment(file));
      return await this.prisma.$transaction(async (tx) => {
        // Serialize uploads and receipt deletion using the parent row lock.
        const receipts = await tx.$queryRaw<
          Array<{ id: number }>
        >`SELECT id FROM warehouse_receipt_items WHERE id = ${receiptId} FOR UPDATE`;
        if (!receipts.length)
          throw new NotFoundException('Warehouse receipt item not found');
        const attachments: Prisma.WarehouseReceiptItemAttachmentsGetPayload<{
          include: typeof receiptAttachmentInclude;
        }>[] = [];
        for (const [index, file] of files.entries()) {
          attachments.push(
            await tx.warehouseReceiptItemAttachments.create({
              data: {
                warehouse_receipt_item_id: receiptId,
                attachment_type: type as string,
                file_path: filePaths[index],
                original_name: file.originalname,
                mime_type: file.mimetype,
                file_size: file.buffer.length,
                uploaded_by_id: userId,
              },
              include: receiptAttachmentInclude,
            }),
          );
        }
        return attachments;
      });
    } catch (error) {
      await removeReceiptAttachments(filePaths);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException('Receipt or uploader no longer exists');
      }
      throw error;
    }
  }

  async findFile(filename: string, thumbnail = false) {
    const filePath = `${RECEIPT_ATTACHMENT_ROUTE}/${filename}`;
    const attachment =
      await this.prisma.warehouseReceiptItemAttachments.findUnique({
        where: { file_path: filePath },
      });
    const file = attachment
      ? await resolveReceiptAttachmentFile(
          attachment.file_path,
          attachment.mime_type,
          thumbnail,
        )
      : null;
    if (!file) throw new NotFoundException('Receipt attachment file not found');
    return file;
  }

  async delete(receiptId: number, attachmentId: number) {
    await this.findById(receiptId, attachmentId);
    let deleted: Prisma.WarehouseReceiptItemAttachmentsGetPayload<{
      include: typeof receiptAttachmentInclude;
    }>;
    try {
      deleted = await this.prisma.warehouseReceiptItemAttachments.delete({
        where: { id: attachmentId, warehouse_receipt_item_id: receiptId },
        include: receiptAttachmentInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Receipt attachment not found');
      }
      throw error;
    }
    await removeReceiptAttachments([deleted.file_path]);
    return deleted;
  }

  private validateType(type: unknown) {
    if (!RECEIPT_ATTACHMENT_TYPES.some((value) => value === type)) {
      throw new BadRequestException(
        'attachment_type must be dispatch_note, coa or invoice',
      );
    }
  }

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647)
      throw new BadRequestException('id must be a positive integer');
  }

  private async ensureReceipt(id: number) {
    this.validateId(id);
    const receipt = await this.prisma.warehouseReceiptItems.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!receipt)
      throw new NotFoundException('Warehouse receipt item not found');
  }
}
