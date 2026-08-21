import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ApproveProductionOrderAttachmentDto } from './dto/approve-production-order-attachment.dto';
import { CreateProductionOrderAttachmentDto } from './dto/create-production-order-attachment.dto';
import { UpdateProductionOrderAttachmentDto } from './dto/update-production-order-attachment.dto';
import {
  removeStoredProductionOrderAttachmentFile,
  resolveProductionOrderAttachmentFile,
} from './production-order-attachment-upload.config';

type AuthenticatedUser = { id?: number | string | null };

const APPROVAL_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  department: true,
  position: true,
  status: true,
};

const attachmentInclude = {
  enteredBy: { select: userSelect },
  approvedBy: { select: userSelect },
  files: {
    orderBy: [{ sort_order: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.ProductionOrderAttachmentsInclude;

@Injectable()
export class ProductionOrderAttachmentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrderExists(productionOrderId);

    return this.prismaService.productionOrderAttachments.findMany({
      where: { production_order_id: productionOrderId },
      include: attachmentInclude,
      orderBy: [{ entered_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(attachmentId: number) {
    const attachment =
      await this.prismaService.productionOrderAttachments.findUnique({
        where: { id: attachmentId },
        include: attachmentInclude,
      });

    if (!attachment) {
      throw new NotFoundException('Production order attachment not found');
    }

    return attachment;
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderAttachmentDto,
    user: AuthenticatedUser | undefined,
    files: Express.Multer.File[],
  ) {
    await this.ensureProductionOrderExists(productionOrderId);
    if (files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const requiresApproval = this.parseBoolean(
      dto?.requires_approval,
      'requires_approval',
      false,
    );

    return this.prismaService.productionOrderAttachments.create({
      data: {
        production_order_id: productionOrderId,
        attachment_type: this.requiredString(
          dto?.attachment_type,
          'attachment_type',
        ),
        description: this.optionalString(dto?.description),
        entered_by_id: this.userId(user),
        requires_approval: requiresApproval,
        approval_status: requiresApproval ? APPROVAL_STATUS.pending : null,
        files: {
          create: files.map((file, index) => ({
            file_path: `/production-orders/attachments/files/${file.filename}`,
            original_filename: this.originalFilename(file.originalname),
            mime_type: file.mimetype,
            file_size: file.size,
            sort_order: index,
          })),
        },
      },
      include: attachmentInclude,
    });
  }

  async update(attachmentId: number, dto: UpdateProductionOrderAttachmentDto) {
    const attachment = await this.findById(attachmentId);
    this.ensureMutable(attachment.approval_status);

    const data: Prisma.ProductionOrderAttachmentsUncheckedUpdateInput = {};
    if (dto.attachment_type !== undefined) {
      data.attachment_type = this.requiredString(
        dto.attachment_type,
        'attachment_type',
      );
    }
    if (dto.description !== undefined) {
      data.description = this.optionalString(dto.description);
    }
    if (dto.requires_approval !== undefined) {
      const requiresApproval = this.parseBoolean(
        dto.requires_approval,
        'requires_approval',
      );
      data.requires_approval = requiresApproval;
      data.approval_status = requiresApproval ? APPROVAL_STATUS.pending : null;
      data.approved_by_id = null;
      data.approved_at = null;
      data.approval_note = null;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No update data provided');
    }

    return this.prismaService.productionOrderAttachments.update({
      where: { id: attachmentId },
      data,
      include: attachmentInclude,
    });
  }

  async approve(
    attachmentId: number,
    dto: ApproveProductionOrderAttachmentDto,
    user: AuthenticatedUser | undefined,
  ) {
    const attachment = await this.findById(attachmentId);
    if (!attachment.requires_approval) {
      throw new BadRequestException(
        'This attachment does not require approval',
      );
    }
    if (attachment.approval_status !== APPROVAL_STATUS.pending) {
      throw new BadRequestException(
        'Attachment is already approved or rejected',
      );
    }

    return this.prismaService.productionOrderAttachments.update({
      where: { id: attachmentId },
      data: {
        approval_status: this.approvalStatus(dto?.approval_status),
        approval_note: this.optionalString(dto?.approval_note),
        approved_by_id: this.userId(user),
        approved_at: new Date(),
      },
      include: attachmentInclude,
    });
  }

  async delete(attachmentId: number) {
    const attachment = await this.findById(attachmentId);
    this.ensureMutable(attachment.approval_status);

    await this.prismaService.productionOrderAttachments.delete({
      where: { id: attachmentId },
    });
    await Promise.all(
      attachment.files.map((file) =>
        removeStoredProductionOrderAttachmentFile(file.file_path),
      ),
    );

    return attachment;
  }

  async addFiles(attachmentId: number, files: Express.Multer.File[]) {
    if (files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const attachment = await this.findById(attachmentId);
    this.ensureMutable(attachment.approval_status);
    const nextSortOrder =
      attachment.files.reduce(
        (max, file) => Math.max(max, file.sort_order),
        -1,
      ) + 1;

    await this.prismaService.productionOrderAttachmentFiles.createMany({
      data: files.map((file, index) => ({
        attachment_id: attachmentId,
        file_path: `/production-orders/attachments/files/${file.filename}`,
        original_filename: this.originalFilename(file.originalname),
        mime_type: file.mimetype,
        file_size: file.size,
        sort_order: nextSortOrder + index,
      })),
    });

    return this.findById(attachmentId);
  }

  async deleteFile(fileId: number) {
    const file =
      await this.prismaService.productionOrderAttachmentFiles.findUnique({
        where: { id: fileId },
        include: { attachment: { select: { approval_status: true } } },
      });
    if (!file) {
      throw new NotFoundException('Production order attachment file not found');
    }
    this.ensureMutable(file.attachment.approval_status);

    await this.prismaService.productionOrderAttachmentFiles.delete({
      where: { id: fileId },
    });
    await removeStoredProductionOrderAttachmentFile(file.file_path);

    return file;
  }

  async findFile(filename: string) {
    const filePath = `/production-orders/attachments/files/${filename}`;
    const file =
      await this.prismaService.productionOrderAttachmentFiles.findFirst({
        where: { file_path: filePath },
        select: { mime_type: true },
      });
    if (!file) {
      return null;
    }

    const storedFile = await resolveProductionOrderAttachmentFile(filename);
    return storedFile ? { ...storedFile, contentType: file.mime_type } : null;
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

  private ensureMutable(approvalStatus: string | null) {
    if (
      approvalStatus === APPROVAL_STATUS.approved ||
      approvalStatus === APPROVAL_STATUS.rejected
    ) {
      throw new BadRequestException(
        'Approved or rejected attachment cannot be changed',
      );
    }
  }

  private requiredString(value: unknown, fieldName: string) {
    const normalizedValue = this.optionalString(value);
    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalizedValue;
  }

  private optionalString(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('Value must be a string');
    }
    const normalizedValue = value.trim();
    return normalizedValue === '' ? null : normalizedValue;
  }

  private parseBoolean(
    value: unknown,
    fieldName: string,
    defaultValue?: boolean,
  ) {
    if (value === undefined || value === null || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new BadRequestException(`${fieldName} must be a boolean`);
    }
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new BadRequestException(`${fieldName} must be a boolean`);
  }

  private approvalStatus(value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException('approval_status is required');
    }
    const normalizedValue = value.trim().toLowerCase();
    if (
      normalizedValue !== APPROVAL_STATUS.approved &&
      normalizedValue !== APPROVAL_STATUS.rejected
    ) {
      throw new BadRequestException(
        'approval_status must be approved or rejected',
      );
    }
    return normalizedValue;
  }

  private userId(user: AuthenticatedUser | undefined) {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return userId;
  }

  private originalFilename(filename: string) {
    const normalizedFilename = Buffer.from(filename, 'latin1').toString('utf8');
    return normalizedFilename.includes('\uFFFD')
      ? filename
      : normalizedFilename;
  }
}
