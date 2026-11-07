import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { GetAuditLogPageDto } from './dto/get-audit-log-page.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const keyword = query.keyword?.trim();
    let entityId: bigint | undefined;
    if (query.entity_id !== undefined) {
      if (!/^[1-9]\d{0,18}$/.test(query.entity_id)) {
        throw new BadRequestException('Invalid entity_id');
      }
      entityId = BigInt(query.entity_id);
      if (entityId > 9223372036854775807n) {
        throw new BadRequestException('Invalid entity_id');
      }
    }
    const where: Prisma.AuditLogsWhereInput = {
      ...(query.entity_type?.trim() && {
        entity_type: query.entity_type.trim(),
      }),
      ...(entityId !== undefined && { entity_id: entityId }),
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

    return this.findMatching(where, page, limit);
  }

  async findForEntities(
    entities: { entityType: string; ids: number[] }[],
    query: GetAuditLogPageDto,
  ) {
    const scopes = entities
      .filter((entity) => entity.ids.length > 0)
      .map((entity) => ({
        entity_type: entity.entityType,
        entity_id: { in: entity.ids.map((id) => BigInt(id)) },
      }));
    return this.findMatching(
      { OR: scopes },
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  async findHistoricalEntityIds(
    entityType: string,
    foreignKey: string,
    parentIds: number[],
  ) {
    if (!parentIds.length) return [];
    const logs = await this.prisma.auditLogs.findMany({
      where: {
        entity_type: entityType,
        OR: parentIds.flatMap((id) => [
          { old_values: { path: `$.${foreignKey}`, equals: id } },
          { new_values: { path: `$.${foreignKey}`, equals: id } },
        ]),
      },
      select: { entity_id: true },
      distinct: ['entity_id'],
    });
    return logs
      .map((log) => Number(log.entity_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0 && id <= 2147483647);
  }

  private async findMatching(
    where: Prisma.AuditLogsWhereInput,
    page: number,
    limit: number,
  ) {
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
