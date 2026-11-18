import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  CreateWarehouseStocktakeDto,
  ListWarehouseStocktakesDto,
} from './warehouse-stocktakes.dto';

const stocktakeInclude = {
  createdBy: { select: { id: true, name: true, username: true } },
  completedBy: { select: { id: true, name: true, username: true } },
} satisfies Prisma.WarehouseStocktakesInclude;

@Injectable()
export class WarehouseStocktakesService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ search, page = 1, limit = 20 }: ListWarehouseStocktakesDto) {
    const where: Prisma.WarehouseStocktakesWhereInput = search
      ? { OR: [{ code: { contains: search } }, { note: { contains: search } }] }
      : {};
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.warehouseStocktakes.findMany({
          where,
          orderBy: [{ stocktake_date: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: stocktakeInclude,
        }),
        this.prisma.warehouseStocktakes.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }

  async findById(id: number) {
    const stocktake = await this.prisma.warehouseStocktakes.findUnique({
      where: { id },
      include: stocktakeInclude,
    });
    if (!stocktake) throw new NotFoundException('Không tìm thấy đợt kiểm kê.');
    return stocktake;
  }

  create(dto: CreateWarehouseStocktakeDto, userId: number) {
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw new UnauthorizedException();
    const dateCode = dto.stocktake_date.replaceAll('-', '');
    return this.prisma.warehouseStocktakes.create({
      data: {
        code: `KK-${dateCode}-${randomBytes(6).toString('hex').toUpperCase()}`,
        stocktake_date: new Date(`${dto.stocktake_date}T00:00:00.000Z`),
        note: dto.note?.trim() || null,
        created_by_id: userId,
      },
      include: stocktakeInclude,
    });
  }
}
