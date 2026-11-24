import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import {
  AuditEntityScope,
  AuditLogsService,
} from '../audit-logs/audit-logs.service';
import { GetProductionOrderHistoryDto } from './dto/get-production-order-history.dto';
import {
  LOT_HISTORY_CATEGORIES,
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

    if (page.scope === 'lot') {
      if (resource !== 'production-order') {
        throw new BadRequestException(
          'Lịch sử toàn bộ lô cần ID lệnh sản xuất',
        );
      }
      return this.findLotHistory(recordId, page, permissions);
    }
    if (page.category !== undefined) {
      throw new BadRequestException(
        'Chỉ lọc biểu mẫu trong lịch sử toàn bộ lô',
      );
    }

    const meta = models.find((model) => model.name === config.model)!;
    let rootIds: number[];
    if (page.scope === 'production-order') {
      if (!meta.fields.some((field) => field.name === 'production_order_id'))
        throw new BadRequestException(
          'Loại phiếu không hỗ trợ lịch sử theo lệnh',
        );
      await this.ensureOrderExists(recordId);
      rootIds = await this.childIds(config.model, 'production_order_id', [
        recordId,
      ]);
    } else {
      const record = await this.delegate(config.model).findUnique({
        where: { id: recordId },
        select: { id: true },
      });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu');
      rootIds = [record.id];
    }
    return this.audit.findForEntities(
      await this.collectEntities(config.model, rootIds),
      page,
    );
  }

  private async findLotHistory(
    orderId: number,
    page: GetProductionOrderHistoryDto,
    permissions: string[],
  ) {
    if (page.category && !LOT_HISTORY_CATEGORIES.includes(page.category)) {
      throw new BadRequestException(
        'Loại biểu mẫu không hỗ trợ trong lịch sử lô',
      );
    }
    if (
      page.category &&
      !permissions.includes(
        PRODUCTION_ORDER_HISTORY_RESOURCES[page.category].permission,
      )
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền xem lịch sử biểu mẫu này',
      );
    }

    await this.ensureOrderExists(orderId);
    const categories = LOT_HISTORY_CATEGORIES.filter(
      (category) =>
        (!page.category || page.category === category) &&
        permissions.includes(
          PRODUCTION_ORDER_HISTORY_RESOURCES[category].permission,
        ),
    );
    const scopes = await Promise.all(
      categories.map(async (category) => {
        const { model } = PRODUCTION_ORDER_HISTORY_RESOURCES[category];
        if (category === 'production-order')
          return this.collectEntities(model, [orderId]);
        if (category === 'production-order-deviation')
          return this.collectLotDeviations(orderId);
        return this.collectEntities(
          model,
          await this.childIds(model, 'production_order_id', [orderId]),
        );
      }),
    );

    return this.audit.findForEntities(scopes.flat(), page);
  }

  private async collectLotDeviations(orderId: number) {
    // Unlike the other forms, a deviation can be reassigned to a different lot.
    const rows = await this.prisma.productionOrderDeviations.findMany({
      where: { production_order_id: orderId },
      select: { id: true },
    });
    const model =
      PRODUCTION_ORDER_HISTORY_RESOURCES['production-order-deviation'].model;
    const meta = models.find((entry) => entry.name === model)!;
    const assignments = await this.audit.findLastAssignmentAuditIds(
      meta.dbName ?? meta.name,
      rows.map(({ id }) => id),
      'production_order_id',
      orderId,
    );
    const untouched: number[] = [];
    const moved: { id: number; auditId: bigint }[] = [];
    for (const { id } of rows) {
      const auditId = assignments.get(id);
      if (auditId === undefined) untouched.push(id);
      else moved.push({ id, auditId });
    }
    const scopes = await Promise.all([
      this.collectEntities(model, untouched),
      ...moved.map(async ({ id, auditId }) =>
        (await this.collectEntities(model, [id])).map((scope) => ({
          ...scope,
          afterAuditId: auditId,
        })),
      ),
    ]);
    return scopes.flat();
  }

  private async ensureOrderExists(orderId: number) {
    // The Prisma extension applies the same lot visibility as detail reads.
    const order = await this.prisma.productionOrders.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy lệnh sản xuất');
  }

  private async childIds(
    modelName: string,
    foreignKey: string,
    parentIds: number[],
  ) {
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
  }

  private async collectEntities(rootModel: string, rootIds: number[]) {
    const entities: AuditEntityScope[] = [];
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
          await this.childIds(child.name, parent.relationFromFields![0], ids),
        );
      }
    };
    await collect(rootModel, rootIds);
    return entities;
  }

  private delegate(model: string): ReadDelegate {
    const key = model[0].toLowerCase() + model.slice(1);
    return (this.prisma as unknown as Record<string, ReadDelegate>)[key];
  }
}
