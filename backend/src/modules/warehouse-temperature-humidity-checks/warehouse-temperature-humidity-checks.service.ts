import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { CreateWarehouseTemperatureHumidityCheckDto } from './dto/create-warehouse-temperature-humidity-check.dto';
import { UpdateWarehouseTemperatureHumidityCheckDto } from './dto/update-warehouse-temperature-humidity-check.dto';

const checkInclude = {
  checkedBy: { select: { id: true, username: true, name: true } },
} satisfies Prisma.WarehouseTemperatureHumidityChecksInclude;
const allowedFields = new Set([
  'location',
  'requirement',
  'temperature',
  'humidity',
  'is_passed',
]);

@Injectable()
export class WarehouseTemperatureHumidityChecksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.warehouseTemperatureHumidityChecks.findMany({
      include: checkInclude,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647)
      throw new BadRequestException('id must be a positive integer');
    const check =
      await this.prisma.warehouseTemperatureHumidityChecks.findUnique({
        where: { id },
        include: checkInclude,
      });
    if (!check)
      throw new NotFoundException(
        'Warehouse temperature humidity check not found',
      );
    return check;
  }

  async create(
    dto: CreateWarehouseTemperatureHumidityCheckDto,
    user?: { id?: number | string | null },
  ) {
    const data = this.buildData(dto, true);
    const checkedById = Number(user?.id);
    if (!Number.isSafeInteger(checkedById) || checkedById <= 0)
      throw new UnauthorizedException('Authenticated user not found');
    const checker = await this.prisma.users.findFirst({
      where: { id: checkedById, deleted_at: null },
      select: { id: true },
    });
    if (!checker)
      throw new UnauthorizedException('Authenticated user not found');
    try {
      return await this.prisma.warehouseTemperatureHumidityChecks.create({
        data: {
          ...data,
          checked_by_id: checkedById,
        } as Prisma.WarehouseTemperatureHumidityChecksUncheckedCreateInput,
        include: checkInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: number, dto: UpdateWarehouseTemperatureHumidityCheckDto) {
    const data = this.buildData(dto, false);
    if (!Object.keys(data).length)
      throw new BadRequestException('No update data provided');
    await this.findById(id);
    try {
      return await this.prisma.warehouseTemperatureHumidityChecks.update({
        where: { id },
        data,
        include: checkInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async delete(id: number) {
    await this.findById(id);
    try {
      return await this.prisma.warehouseTemperatureHumidityChecks.delete({
        where: { id },
        include: checkInclude,
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  private buildData(
    dto: UpdateWarehouseTemperatureHumidityCheckDto,
    creating: boolean,
  ) {
    if (!dto || typeof dto !== 'object' || Array.isArray(dto))
      throw new BadRequestException('Request body must be an object');
    for (const field of Object.keys(dto)) {
      if (!allowedFields.has(field))
        throw new BadRequestException(`Unknown field: ${field}`);
    }
    const data: {
      location?: string;
      requirement?: string;
      temperature?: Prisma.Decimal;
      humidity?: Prisma.Decimal;
      is_passed?: boolean;
    } = {};
    for (const field of ['location', 'requirement'] as const) {
      if (!creating && dto[field] === undefined) continue;
      const value = dto[field];
      if (typeof value !== 'string' || !value.trim())
        throw new BadRequestException(`${field} is required`);
      const normalized = value.trim();
      if (
        (field === 'location' && [...normalized].length > 255) ||
        (field === 'requirement' &&
          Buffer.byteLength(normalized, 'utf8') > 65535)
      )
        throw new BadRequestException(`${field} exceeds maximum length`);
      data[field] = normalized;
    }
    for (const field of ['temperature', 'humidity'] as const) {
      if (!creating && dto[field] === undefined) continue;
      const value = dto[field];
      const min = field === 'humidity' ? 0 : -999.99;
      const max = field === 'humidity' ? 100 : 999.99;
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        !/^-?\d+(?:\.\d{1,2})?$/.test(String(value))
      )
        throw new BadRequestException(
          `${field} must be a number between ${min} and ${max} with at most 2 decimal places`,
        );
      data[field] = new Prisma.Decimal(value);
    }
    if (creating || dto.is_passed !== undefined) {
      if (typeof dto.is_passed !== 'boolean')
        throw new BadRequestException('is_passed must be a boolean');
      data.is_passed = dto.is_passed;
    }
    return data;
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025')
        throw new NotFoundException(
          'Warehouse temperature humidity check not found',
        );
      if (error.code === 'P2003')
        throw new ConflictException(
          'Related user no longer exists or this check is in use',
        );
    }
    throw error;
  }
}
