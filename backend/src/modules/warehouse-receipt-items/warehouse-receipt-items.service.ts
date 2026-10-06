import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isISO8601 } from 'class-validator';
import { PrismaService } from 'src/prisma.service';
import { CreateWarehouseReceiptItemDto } from './dto/create-warehouse-receipt-item.dto';
import { UpdateWarehouseReceiptItemDto } from './dto/update-warehouse-receipt-item.dto';

const receiptInclude = {
  item: { select: { item_code: true, item_name: true, unit: true } },
  supplier: { select: { card_code: true, card_name: true, tax_code: true } },
  enteredBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.WarehouseReceiptItemsInclude;

const optionalTextLimits = {
  manufacturer_lot_number: 100,
  packaging_specification: 255,
  manufacturer_name: 255,
  note: 65535,
} as const;
const allowedFields = new Set([
  'item_code',
  'supplier_code',
  'lot_number',
  'expiry_date',
  'received_at',
  ...Object.keys(optionalTextLimits),
]);

@Injectable()
export class WarehouseReceiptItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.warehouseReceiptItems.findMany({
      include: receiptInclude,
      orderBy: [{ received_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    this.validateId(id);
    const receipt = await this.prisma.warehouseReceiptItems.findUnique({
      where: { id },
      include: receiptInclude,
    });
    if (!receipt)
      throw new NotFoundException('Warehouse receipt item not found');
    return receipt;
  }

  async create(
    dto: CreateWarehouseReceiptItemDto,
    user?: { id?: number | string | null },
  ) {
    this.validateBody(dto);
    const enteredById = Number(user?.id);
    if (!Number.isSafeInteger(enteredById) || enteredById <= 0) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    const data = this.buildData(dto, true);
    await this.ensureItemExists(data.item_code as string);
    if (typeof data.supplier_code === 'string')
      await this.ensureSupplierExists(data.supplier_code);
    const enteredBy = await this.prisma.users.findFirst({
      where: { id: enteredById, deleted_at: null },
      select: { id: true },
    });
    if (!enteredBy)
      throw new UnauthorizedException('Authenticated user not found');
    try {
      return await this.prisma.warehouseReceiptItems.create({
        data: {
          ...data,
          entered_by_id: enteredById,
        } as Prisma.WarehouseReceiptItemsUncheckedCreateInput,
        include: receiptInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: number, dto: UpdateWarehouseReceiptItemDto) {
    this.validateBody(dto);
    await this.findById(id);
    const data = this.buildData(dto, false);
    if (Object.keys(data).length === 0)
      throw new BadRequestException('No update data provided');
    if (data.item_code !== undefined)
      await this.ensureItemExists(data.item_code as string);
    if (typeof data.supplier_code === 'string')
      await this.ensureSupplierExists(data.supplier_code);
    try {
      return await this.prisma.warehouseReceiptItems.update({
        where: { id },
        data,
        include: receiptInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async delete(id: number) {
    await this.findById(id);
    try {
      return await this.prisma.warehouseReceiptItems.delete({
        where: { id },
        include: receiptInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private buildData(dto: UpdateWarehouseReceiptItemDto, creating: boolean) {
    const data: Prisma.WarehouseReceiptItemsUncheckedUpdateInput = {};
    if (creating || dto.item_code !== undefined) {
      data.item_code = this.requiredText(dto.item_code, 'item_code', 191);
    }
    if (creating || dto.lot_number !== undefined) {
      data.lot_number = this.requiredText(dto.lot_number, 'lot_number', 100);
    }
    if (dto.supplier_code !== undefined) {
      data.supplier_code =
        dto.supplier_code === null || dto.supplier_code === ''
          ? null
          : this.requiredText(dto.supplier_code, 'supplier_code', 191);
      // Explicit supplier selection or clearing replaces the legacy free-text name.
      data.supplier_name = null;
    }
    for (const [field, limit] of Object.entries(optionalTextLimits)) {
      const key = field as keyof typeof optionalTextLimits;
      const value = dto[key];
      if (value === undefined) continue;
      if (value === null) {
        data[key] = null;
      } else {
        if (typeof value !== 'string')
          throw new BadRequestException(`${field} must be a string`);
        const normalized = value.trim();
        const length =
          field === 'note'
            ? Buffer.byteLength(normalized, 'utf8')
            : [...normalized].length;
        if (length > limit)
          throw new BadRequestException(
            `${field} exceeds maximum length ${limit}`,
          );
        data[key] = normalized || null;
      }
    }
    if (dto.expiry_date !== undefined) {
      const value = dto.expiry_date;
      if (value === null) {
        data.expiry_date = null;
      } else {
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !isISO8601(value, { strict: true }) ||
          Number(value.slice(0, 4)) < 1000
        ) {
          throw new BadRequestException(
            'expiry_date must be a valid date in YYYY-MM-DD format',
          );
        }
        data.expiry_date = new Date(`${value}T00:00:00.000Z`);
      }
    }
    if (dto.received_at !== undefined) {
      const value = dto.received_at;
      if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
          value,
        ) ||
        !isISO8601(value, { strict: true }) ||
        Number(value.slice(0, 4)) < 1000 ||
        !Number.isFinite(Date.parse(value))
      ) {
        throw new BadRequestException(
          'received_at must be a valid ISO datetime with timezone',
        );
      }
      data.received_at = new Date(value);
    }
    return data;
  }

  private validateBody(dto: unknown) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto))
      throw new BadRequestException('Request body must be an object');
    for (const field of Object.keys(dto)) {
      if (!allowedFields.has(field))
        throw new BadRequestException(`Unknown field: ${field}`);
    }
  }

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647)
      throw new BadRequestException('id must be a positive integer');
  }

  private requiredText(value: unknown, field: string, limit: number) {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException(`${field} is required`);
    const normalized = value.trim();
    if ([...normalized].length > limit)
      throw new BadRequestException(`${field} exceeds maximum length ${limit}`);
    return normalized;
  }

  private async ensureItemExists(item_code: string) {
    const item = await this.prisma.items.findFirst({
      where: { item_code, deleted_at: null },
      select: { item_code: true },
    });
    if (!item)
      throw new BadRequestException('Item does not exist or has been deleted');
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025')
        throw new NotFoundException('Warehouse receipt item not found');
      if (error.code === 'P2003')
        throw new ConflictException(
          'Related item, supplier or user no longer exists, or this receipt is in use',
        );
    }
    throw error;
  }

  private async ensureSupplierExists(card_code: string) {
    const supplier = await this.prisma.businessPartners.findUnique({
      where: { card_code },
      select: { card_type: true },
    });
    if (!supplier || supplier.card_type !== 'cSupplier')
      throw new BadRequestException(
        'Supplier does not exist or is not a supplier',
      );
  }
}
