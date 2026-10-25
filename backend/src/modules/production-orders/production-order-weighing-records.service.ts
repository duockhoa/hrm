import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateProductionOrderWeighingRecordDto } from './dto/create-production-order-weighing-record.dto';
import { UpdateProductionOrderWeighingRecordDto } from './dto/update-production-order-weighing-record.dto';

type AuthenticatedUser = { id?: number | string | null };
const userSelect = { id: true, username: true, name: true };
const recordInclude = {
  createdBy: { select: userSelect },
  qaStaffApprovedBy: { select: userSelect },
  ipcStaffApprovedBy: { select: userSelect },
} satisfies Prisma.ProductionOrderWeighingRecordsInclude;
const editableStatuses = ['draft', 'in_progress', 'completed', 'cancelled'];

@Injectable()
export class ProductionOrderWeighingRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProductionOrder(productionOrderId: number) {
    await this.ensureProductionOrder(productionOrderId);
    return this.prisma.productionOrderWeighingRecords.findMany({
      where: { production_order_id: productionOrderId },
      include: recordInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    const record = await this.prisma.productionOrderWeighingRecords.findUnique({
      where: { id },
      include: recordInclude,
    });
    if (!record)
      throw new NotFoundException('Production order weighing record not found');
    return record;
  }

  async create(
    productionOrderId: number,
    dto: CreateProductionOrderWeighingRecordDto,
    user?: AuthenticatedUser,
  ) {
    const userId = this.userId(user);
    this.validateBody(dto, ['description']);
    const description =
      dto.description === undefined ? null : this.description(dto.description);
    await this.ensureProductionOrder(productionOrderId);
    try {
      return await this.prisma.productionOrderWeighingRecords.create({
        data: {
          production_order_id: productionOrderId,
          description,
          created_by_id: userId,
        },
        include: recordInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: number, dto: UpdateProductionOrderWeighingRecordDto) {
    this.validateBody(dto, ['description', 'status']);
    const data: Prisma.ProductionOrderWeighingRecordsUpdateInput = {};
    if (dto.description !== undefined)
      data.description = this.description(dto.description);
    if (dto.status !== undefined) {
      if (!editableStatuses.includes(dto.status)) {
        throw new BadRequestException(
          `status must be one of: ${editableStatuses.join(', ')}`,
        );
      }
      data.status = dto.status;
    }
    if (!Object.keys(data).length)
      throw new BadRequestException('No fields to update');
    const record = await this.findById(id);
    this.ensureEditable(record);
    try {
      return await this.prisma.productionOrderWeighingRecords.update({
        // Include approval fields in the write to prevent edits racing a signature.
        where: {
          id,
          status: record.status,
          qa_staff_approved_at: null,
          ipc_staff_approved_at: null,
        },
        data,
        include: recordInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async delete(id: number) {
    const record = await this.findById(id);
    this.ensureEditable(record);
    try {
      return await this.prisma.productionOrderWeighingRecords.delete({
        where: {
          id,
          status: record.status,
          qa_staff_approved_at: null,
          ipc_staff_approved_at: null,
        },
        include: recordInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  approveByQaStaff(id: number, user?: AuthenticatedUser) {
    return this.approve(id, 'qa', user);
  }

  approveByIpcStaff(id: number, user?: AuthenticatedUser) {
    return this.approve(id, 'ipc', user);
  }

  private async approve(
    id: number,
    role: 'qa' | 'ipc',
    user?: AuthenticatedUser,
  ) {
    const userId = this.userId(user);
    const record = await this.findById(id);
    const alreadyApproved =
      role === 'qa'
        ? record.qa_staff_approved_at
        : record.ipc_staff_approved_at;
    if (alreadyApproved)
      throw new ConflictException('This approval has already been recorded');
    const otherApproved =
      role === 'qa'
        ? record.ipc_staff_approved_at
        : record.qa_staff_approved_at;
    const now = new Date();
    try {
      return await this.prisma.productionOrderWeighingRecords.update({
        // Compare both signatures so concurrent approvals cannot leave status stale.
        where: {
          id,
          status: record.status,
          qa_staff_approved_at: record.qa_staff_approved_at,
          ipc_staff_approved_at: record.ipc_staff_approved_at,
        },
        data: {
          ...(role === 'qa'
            ? { qa_staff_approved_by_id: userId, qa_staff_approved_at: now }
            : { ipc_staff_approved_by_id: userId, ipc_staff_approved_at: now }),
          status: otherApproved ? 'approved' : record.status,
        },
        include: recordInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private ensureEditable(record: {
    status: string;
    qa_staff_approved_at: Date | null;
    ipc_staff_approved_at: Date | null;
  }) {
    if (record.ipc_staff_approved_at) {
      throw new ConflictException(
        'IPC đã ký duyệt, không thể sửa hoặc xóa phiếu cân.',
      );
    }
    if (record.status === 'approved' || record.qa_staff_approved_at) {
      throw new ConflictException(
        'Approved weighing records cannot be edited or deleted',
      );
    }
  }

  private async ensureProductionOrder(id: number) {
    const order = await this.prisma.productionOrders.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Production order not found');
  }

  private userId(user?: AuthenticatedUser) {
    const id = Number(user?.id);
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new UnauthorizedException('Authenticated user not found');
    return id;
  }

  private validateBody(dto: unknown, fields: string[]) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
      throw new BadRequestException('Request body must be an object');
    }
    if (Object.keys(dto).some((key) => !fields.includes(key))) {
      throw new BadRequestException(
        `Only these fields are allowed: ${fields.join(', ')}`,
      );
    }
  }

  private description(value: unknown) {
    if (value === null) return null;
    if (typeof value !== 'string')
      throw new BadRequestException('description must be a string or null');
    const text = value.trim();
    if (Buffer.byteLength(text, 'utf8') > 65535)
      throw new BadRequestException('description is too long');
    return text || null;
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025')
        throw new ConflictException(
          'Weighing record changed; reload and try again',
        );
      if (error.code === 'P2003')
        throw new BadRequestException(
          'Referenced production order or user no longer exists',
        );
    }
    throw error;
  }
}
