import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { auditContext } from '../audit/audit-context';

export interface ProductionOrderScope {
  limit: number | null;
  orderIds: number[] | null;
}

// Only scope resolution bypasses the filter. Background jobs have no user context.
const resolvingScope = new AsyncLocalStorage<boolean>();

type ScopeClient = {
  userRoles: { findMany(args: any): Promise<any[]> };
  productionOrders: { findMany(args: any): Promise<{ id: number }[]> };
};

export function effectiveProductionOrderLimit(
  roles: { production_order_read_limit: number | null }[],
): number | null {
  if (!roles.length) return 0;
  if (roles.some((role) => role.production_order_read_limit === null))
    return null;
  return Math.max(
    0,
    ...roles.map((role) => {
      const limit = role.production_order_read_limit;
      return Number.isInteger(limit) && limit! > 0 ? limit! : 0;
    }),
  );
}

export async function getProductionOrderScope(
  client: ScopeClient,
): Promise<ProductionOrderScope> {
  const context = auditContext.getStore();
  if (resolvingScope.getStore() || !context?.request.user) {
    return { limit: null, orderIds: null };
  }
  const userId = context.request.user.id;
  if (!Number.isSafeInteger(userId) || userId! <= 0) {
    return { limit: 0, orderIds: [] };
  }
  // One snapshot per request, shared by list, count, child queries and SQL.
  context.productionOrderScope ??= resolvingScope.run(true, async () => {
    const assignments = await client.userRoles.findMany({
      where: { user_id: userId, roles: { deleted_at: null } },
      select: { roles: { select: { production_order_read_limit: true } } },
    });
    const limit = effectiveProductionOrderLimit(
      assignments.map((row) => row.roles),
    );
    if (limit === null) return { limit, orderIds: null };
    if (limit === 0) return { limit, orderIds: [] };
    const orders = await client.productionOrders.findMany({
      select: { id: true },
      orderBy: [{ creation_date: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return { limit, orderIds: orders.map((order) => order.id) };
  });
  return context.productionOrderScope;
}

export function productionOrderScopeSql(orderIds?: number[] | null) {
  return orderIds == null
    ? Prisma.sql`1=1`
    : orderIds.length
      ? Prisma.sql`p.id IN (${Prisma.join(orderIds)})`
      : Prisma.sql`1=0`;
}

export async function assertProductionOrderInScope(
  client: ScopeClient,
  id: number,
) {
  const scope = await getProductionOrderScope(client);
  if (scope.orderIds !== null && !scope.orderIds.includes(id)) {
    throw new NotFoundException('Production order not found');
  }
}

export function productionOrderScopeMetadata(scope: ProductionOrderScope) {
  return {
    production_order_read_limit: scope.limit,
    visible_order_count: scope.orderIds?.length ?? null,
    order_by: ['creation_date DESC', 'id DESC'],
  };
}
