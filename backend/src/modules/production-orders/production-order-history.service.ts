import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GetProductionOrderHistoryDto } from './dto/get-production-order-history.dto';
import {
  PRODUCTION_ORDER_HISTORY_RESOURCES,
  ProductionOrderHistoryResource,
} from './production-order-history.resources';

export type HistoryUser = {
  permissions?: string[];
  userRoles?: {
    roles?: { rolePermissions?: { permissions?: { name?: string } }[] };
  }[];
};

type ReadDelegate = {
  findUnique(args: {
    where: { id: number };
    select: { id: true };
  }): Promise<{ id: number } | null>;
  findMany(args: {
    where: Record<string, unknown>;
    select: { id: true };
  }): Promise<{ id: number }[]>;
};

const models = Prisma.dmmf.datamodel.models;

@Injectable()
export class ProductionOrderHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  async findHistory(
    resource: string,
    recordId: number,
    page: GetProductionOrderHistoryDto,
    user: HistoryUser,
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        PRODUCTION_ORDER_HISTORY_RESOURCES,
        resource,
      )
    ) {
      throw new NotFoundException('Loại phiếu không hỗ trợ lịch sử');
    }
    if (
      !Number.isSafeInteger(recordId) ||
      recordId <= 0 ||
      recordId > 2147483647
    ) {
      throw new BadRequestException('ID phiếu không hợp lệ');
    }
    const config =
      PRODUCTION_ORDER_HISTORY_RESOURCES[
        resource as ProductionOrderHistoryResource
      ];
    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : (user.userRoles?.flatMap(
          (assignment) =>
            assignment.roles?.rolePermissions?.flatMap((rolePermission) =>
              rolePermission.permissions?.name
                ? [rolePermission.permissions.name]
                : [],
            ) ?? [],
        ) ?? []);
    if (!permissions.includes(config.permission))
      throw new ForbiddenException('Bạn không có quyền xem lịch sử phiếu này');

    // The Prisma scope extension applies the same production-order visibility as detail reads.
    const meta = models.find((model) => model.name === config.model)!;
    let rootIds: number[];
    const childIds = async (
      modelName: string,
      foreignKey: string,
      parentIds: number[],
    ) => {
      const child = models.find((model) => model.name === modelName)!;
      const [rows, historicalIds] = await Promise.all([
        this.delegate(modelName).findMany({
          where: { [foreignKey]: { in: parentIds } },
          select: { id: true },
        }),
        this.audit.findHistoricalEntityIds(
          child.dbName ?? child.name,
          foreignKey,
          parentIds,
        ),
      ]);
      return [...new Set([...rows.map((row) => row.id), ...historicalIds])];
    };
    if (page.scope === 'production-order') {
      if (!meta.fields.some((field) => field.name === 'production_order_id'))
        throw new BadRequestException(
          'Loại phiếu không hỗ trợ lịch sử theo lệnh',
        );
      const order = await this.prisma.productionOrders.findUnique({
        where: { id: recordId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy lệnh sản xuất');
      rootIds = await childIds(config.model, 'production_order_id', [order.id]);
    } else {
      const record = await this.delegate(config.model).findUnique({
        where: { id: recordId },
        select: { id: true },
      });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu');
      rootIds = [record.id];
    }

    const entities: { entityType: string; ids: number[] }[] = [];
    const visited = new Set<string>();
    const collect = async (modelName: string, ids: number[]) => {
      if (!ids.length || visited.has(modelName)) return;
      visited.add(modelName);
      const meta = models.find((model) => model.name === modelName)!;
      entities.push({ entityType: meta.dbName ?? meta.name, ids });
      // Root order history covers the order itself. Each nested form has its own read permission.
      if (modelName === 'ProductionOrders') return;
      for (const child of models) {
        const parent = child.fields.find(
          (field) =>
            field.kind === 'object' &&
            !field.isList &&
            field.type === modelName &&
            field.relationFromFields?.length === 1 &&
            field.relationToFields?.[0] === 'id',
        );
        if (!parent || visited.has(child.name)) continue;
        await collect(
          child.name,
          await childIds(child.name, parent.relationFromFields![0], ids),
        );
      }
    };
    await collect(config.model, rootIds);
    return this.audit.findForEntities(entities, page);
  }

  private delegate(model: string): ReadDelegate {
    const key = model[0].toLowerCase() + model.slice(1);
    return (this.prisma as unknown as Record<string, ReadDelegate>)[key];
  }
}
