import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const keyword = query.keyword?.trim();
    const where: Prisma.AuditLogsWhereInput = {
      ...(query.entity_type?.trim() && {
        entity_type: query.entity_type.trim(),
      }),
      ...(query.action && { action: query.action }),
      ...(keyword && {
        OR: [
          { entity_type: { contains: keyword } },
          { entity_name: { contains: keyword } },
          { actor_name: { contains: keyword } },
          { reason: { contains: keyword } },
        ],
      }),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLogs.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          entity_type: true,
          entity_id: true,
          entity_name: true,
          action: true,
          old_values: true,
          new_values: true,
          actor_id: true,
          actor_name: true,
          reason: true,
          request_id: true,
          created_at: true,
        },
      }),
      this.prisma.auditLogs.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        ...log,
        id: log.id.toString(),
        entity_id: log.entity_id.toString(),
        actor_id: log.actor_id?.toString() ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
