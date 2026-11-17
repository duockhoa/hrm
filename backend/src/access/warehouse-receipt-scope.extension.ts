import { Prisma } from '@prisma/client';
import {
  currentWarehouseReceiptScope,
  WarehouseReceiptScope,
} from './warehouse-receipt-scope';

type Args = Record<string, any>;
const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);
const receiptChildren = new Set([
  'WarehouseReceiptItemAttachments',
  'WarehouseReceiptItemSapConfirmations',
  'WarehouseReceiptItemSamplingRequests',
]);

export function warehouseReceiptModelWhere(
  model: string,
  scope: WarehouseReceiptScope,
): Args | null {
  if (scope.kind === 'all') return null;
  const receiptWhere =
    scope.kind === 'own' ? { entered_by_id: scope.userId } : { id: { in: [] } };
  if (model === 'WarehouseReceiptItems') return receiptWhere;
  if (receiptChildren.has(model)) return { receipt: { is: receiptWhere } };
  // Finished-product drafts share this table and retain their existing permissions.
  if (model === 'WarehouseReceiptItemSamplingRequestDrafts')
    return {
      OR: [
        { request_type: 'TP' },
        { request_type: 'NL', receipt: { is: receiptWhere } },
      ],
    };
  return null;
}

function intersect(where: Args | undefined, scope: Args): Args {
  return {
    ...where,
    AND: [
      ...(where?.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : []),
      scope,
    ],
  };
}

function scopeProjection(
  model: string,
  args: Args,
  scope: WarehouseReceiptScope,
): Args {
  const result = { ...args };
  for (const key of ['include', 'select']) {
    if (!args[key]) continue;
    const projection = { ...args[key] };
    const fields = models.get(model)?.fields ?? [];
    for (const field of fields) {
      if (field.kind !== 'object' || !projection[field.name]) continue;
      const value = projection[field.name];
      let nested = value === true ? {} : value;
      const filter = warehouseReceiptModelWhere(field.type, scope);
      if (filter && (field.isList || !field.isRequired))
        nested = { ...nested, where: intersect(nested.where, filter) };
      projection[field.name] = scopeProjection(field.type, nested, scope);
    }
    if (projection._count) {
      const counts =
        projection._count === true
          ? Object.fromEntries(
              fields
                .filter((field) => field.kind === 'object' && field.isList)
                .map((field) => [field.name, true]),
            )
          : { ...projection._count.select };
      for (const field of fields) {
        if (!counts[field.name] || !field.isList) continue;
        const filter = warehouseReceiptModelWhere(field.type, scope);
        if (filter)
          counts[field.name] = {
            where: intersect(counts[field.name]?.where, filter),
          };
      }
      projection._count = { select: counts };
    }
    result[key] = projection;
  }
  return result;
}

export function scopeWarehouseReceiptQuery(
  model: string,
  args: Args,
  scope: WarehouseReceiptScope,
): Args {
  const result = scopeProjection(model, args, scope);
  const filter = warehouseReceiptModelWhere(model, scope);
  if (filter) result.where = intersect(args.where, filter);
  return result;
}

const operations = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

export const warehouseReceiptScopeExtension = Prisma.defineExtension({
  name: 'warehouse-receipt-read-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!operations.has(operation)) return query(args);
        const scope = currentWarehouseReceiptScope();
        if (scope.kind === 'all') return query(args);
        return (query as (value: any) => any)(
          scopeWarehouseReceiptQuery(model, (args ?? {}) as Args, scope),
        );
      },
    },
  },
});
