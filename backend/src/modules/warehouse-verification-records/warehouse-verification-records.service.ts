import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ReceiptScopeUser,
  warehouseReceiptScopeForUser,
} from 'src/access/warehouse-receipt-scope';
import { PrismaService } from 'src/prisma.service';
import { PRODUCTION_ORDER_PERMISSIONS } from '../production-orders/production-orders.permissions';
import {
  CreateVerificationRecordDto,
  VerificationListQueryDto,
  VerificationSubjectsQueryDto,
} from './warehouse-verification-records.dto';

export type VerificationUser = ReceiptScopeUser & { id: number };

const receiptSelect = {
  id: true,
  item_code: true,
  lot_number: true,
  received_at: true,
  item: { select: { item_name: true } },
} satisfies Prisma.WarehouseReceiptItemsSelect;

const orderSelect = {
  id: true,
  item_code: true,
  production_order_code: true,
  lot_no: true,
  creation_date: true,
  item: { select: { item_name: true } },
} satisfies Prisma.ProductionOrdersSelect;

const recordInclude = {
  createdBy: { select: { id: true, name: true, username: true } },
  warehouseReceiptItem: { select: receiptSelect },
  productionOrder: { select: orderSelect },
} satisfies Prisma.WarehouseVerificationRecordsInclude;

function canReadOrders(user: VerificationUser) {
  const permissions =
    user.permissions ??
    user.userRoles?.flatMap(({ roles }) =>
      roles?.deleted_at
        ? []
        : (roles?.rolePermissions ?? []).map(
            ({ permissions }) => permissions?.name,
          ),
    ) ??
    [];
  return permissions.some(
    (permission) =>
      permission === PRODUCTION_ORDER_PERMISSIONS.LIST ||
      permission === PRODUCTION_ORDER_PERMISSIONS.READ,
  );
}

function recordScope(
  user: VerificationUser,
): Prisma.WarehouseVerificationRecordsWhereInput {
  const allowed: Prisma.WarehouseVerificationRecordsWhereInput[] = [];
  const receiptScope = warehouseReceiptScopeForUser(user);
  if (receiptScope.kind === 'all') {
    allowed.push({ warehouse_receipt_item_id: { not: null } });
  } else if (receiptScope.kind === 'own') {
    allowed.push({
      warehouseReceiptItem: { is: { entered_by_id: receiptScope.userId } },
    });
  }
  if (canReadOrders(user)) {
    // The scoped Prisma client also enforces the user's production order limit.
    allowed.push({ production_order_id: { not: null } });
  }
  return allowed.length ? { OR: allowed } : { id: { in: [] } };
}

@Injectable()
export class WarehouseVerificationRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    { search, page = 1, limit = 20 }: VerificationListQueryDto,
    user: VerificationUser,
  ) {
    const scope = recordScope(user);
    const where: Prisma.WarehouseVerificationRecordsWhereInput = search
      ? {
          AND: [
            scope,
            {
              OR: [
                { record_code: { contains: search } },
                { location: { contains: search } },
              ],
            },
          ],
        }
      : scope;
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.warehouseVerificationRecords.findMany({
          where,
          include: recordInclude,
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.warehouseVerificationRecords.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }

  async detail(id: number, user: VerificationUser) {
    const record = await this.prisma.warehouseVerificationRecords.findFirst({
      where: { AND: [{ id }, recordScope(user)] },
      include: recordInclude,
    });
    if (!record)
      throw new NotFoundException('Không tìm thấy biên bản xác minh.');
    return record;
  }

  async subjects(
    { type, search, page = 1, limit = 10 }: VerificationSubjectsQueryDto,
    user: VerificationUser,
  ) {
    this.assertSubjectAccess(type, user);
    const skip = (page - 1) * limit;
    const itemSearch = search
      ? [
          { item_code: { contains: search } },
          { item: { is: { item_name: { contains: search } } } },
        ]
      : [];

    if (type === 'receipt') {
      const where: Prisma.WarehouseReceiptItemsWhereInput = search
        ? { OR: [...itemSearch, { lot_number: { contains: search } }] }
        : {};
      const [rows, total] = await this.prisma.$transaction(
        [
          this.prisma.warehouseReceiptItems.findMany({
            where,
            select: receiptSelect,
            orderBy: [{ received_at: 'desc' }, { id: 'desc' }],
            skip,
            take: limit,
          }),
          this.prisma.warehouseReceiptItems.count({ where }),
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      return {
        data: rows.map((row) => ({
          id: row.id,
          item_code: row.item_code,
          item_name: row.item.item_name,
          lot_number: row.lot_number,
          reference: null,
          date: row.received_at,
        })),
        total,
        page,
        limit,
      };
    }

    const where: Prisma.ProductionOrdersWhereInput = search
      ? {
          OR: [
            ...itemSearch,
            { lot_no: { contains: search } },
            { production_order_code: { contains: search } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.productionOrders.findMany({
          where,
          select: orderSelect,
          orderBy: [{ creation_date: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.productionOrders.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: rows.map((row) => ({
        id: row.id,
        item_code: row.item_code,
        item_name: row.item.item_name,
        lot_number: row.lot_no,
        reference: row.production_order_code,
        date: row.creation_date,
      })),
      total,
      page,
      limit,
    };
  }

  async create(dto: CreateVerificationRecordDto, user: VerificationUser) {
    const receiptId = dto.warehouse_receipt_item_id ?? null;
    const orderId = dto.production_order_id ?? null;
    if ((receiptId === null) === (orderId === null)) {
      throw new BadRequestException(
        'Chọn đúng một dòng hàng nhập kho hoặc một lệnh sản xuất.',
      );
    }

    const type = receiptId === null ? 'production_order' : 'receipt';
    this.assertSubjectAccess(type, user);
    const subject =
      receiptId !== null
        ? await this.prisma.warehouseReceiptItems.findUnique({
            where: { id: receiptId },
            select: { id: true },
          })
        : await this.prisma.productionOrders.findUnique({
            where: { id: orderId! },
            select: { id: true },
          });
    if (!subject)
      throw new NotFoundException('Không tìm thấy đối tượng xác minh.');

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Keep the sequence locked until the new record is committed.
          const sequence = await tx.warehouseVerificationCodeSequence.update({
            where: { id: 1 },
            data: { last_number: { increment: 1n } },
          });
          return tx.warehouseVerificationRecords.create({
            data: {
              record_code: `BMXM${String(sequence.last_number).padStart(5, '0')}`,
              location: dto.location,
              warehouse_receipt_item_id: receiptId,
              production_order_id: orderId,
              created_by_id: user.id,
            },
            include: recordInclude,
          });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2003') {
            throw new ConflictException(
              'Dữ liệu liên kết đã thay đổi. Vui lòng tải lại và chọn lại đối tượng.',
            );
          }
        }
        throw error;
      }
    }
  }

  private assertSubjectAccess(
    type: VerificationSubjectsQueryDto['type'],
    user: VerificationUser,
  ) {
    const allowed =
      type === 'receipt'
        ? warehouseReceiptScopeForUser(user).kind !== 'none'
        : canReadOrders(user);
    if (!allowed) {
      throw new ForbiddenException('Bạn chưa có quyền xem loại đối tượng này.');
    }
  }
}
