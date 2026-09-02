import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { ExportItemsQueryDto } from './dto/export-items.query.dto';

const ITEM_EXPORT_SELECT = {
  item_code: true,
  item_name: true,
  unit: true,
  dk_code: true,
  registration_id: true,
  registration: true,
  created_at: true,
  update_at: true,
  deleted_at: true,
} satisfies Prisma.ItemsSelect;

@Injectable()
export class DataExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportItems(query: ExportItemsQueryDto) {
    const where: Prisma.ItemsWhereInput = {};

    if (query.updated_from) {
      where.update_at = { gte: new Date(query.updated_from) };
    }

    if (query.include_deleted !== 'true') {
      where.deleted_at = null;
    }

    const skip = (query.page - 1) * query.limit;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.items.count({ where }),
      this.prisma.items.findMany({
        where,
        select: ITEM_EXPORT_SELECT,
        orderBy: [{ created_at: 'asc' }, { item_code: 'asc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
        has_next_page: skip + data.length < total,
      },
    };
  }
}
