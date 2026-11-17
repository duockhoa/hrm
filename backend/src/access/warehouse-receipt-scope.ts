import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { auditContext } from '../audit/audit-context';

export const WAREHOUSE_RECEIPT_PERMISSIONS = {
  READ_ALL: 'warehouse-receipt-items.read-all',
  READ_OWN: 'warehouse-receipt-items.read-own',
} as const;

export type ReceiptScopeUser = {
  id?: number | string;
  permissions?: string[];
  userRoles?: Array<{
    roles?: {
      deleted_at?: Date | string | null;
      rolePermissions?: Array<{ permissions?: { name?: string } }>;
    };
  }>;
};

export type WarehouseReceiptScope =
  { kind: 'all' } | { kind: 'own'; userId: number } | { kind: 'none' };

export function warehouseReceiptScopeForUser(
  user?: ReceiptScopeUser,
): WarehouseReceiptScope {
  const id = Number(user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return { kind: 'none' };
  const permissions =
    user?.permissions ??
    user?.userRoles?.flatMap((assignment) =>
      assignment.roles?.deleted_at
        ? []
        : (assignment.roles?.rolePermissions?.map(
            (row) => row.permissions?.name,
          ) ?? []),
    ) ??
    [];
  if (permissions.includes(WAREHOUSE_RECEIPT_PERMISSIONS.READ_ALL))
    return { kind: 'all' };
  if (permissions.includes(WAREHOUSE_RECEIPT_PERMISSIONS.READ_OWN))
    return { kind: 'own', userId: id };
  return { kind: 'none' };
}

export function currentWarehouseReceiptScope(): WarehouseReceiptScope {
  const context = auditContext.getStore();
  // Background work has no authenticated HTTP request; user requests never bypass scope.
  if (!context?.request.user) return { kind: 'all' };
  return warehouseReceiptScopeForUser(context.request.user);
}

@Injectable()
export class WarehouseReceiptReadGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return (
      warehouseReceiptScopeForUser(context.switchToHttp().getRequest().user)
        .kind !== 'none'
    );
  }
}
