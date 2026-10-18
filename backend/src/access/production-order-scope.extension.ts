import { Prisma } from '@prisma/client';
import { getProductionOrderScope } from './production-order-scope';

type QueryArgs = Record<string, any>;
const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);

// Follow owning foreign keys only. Shared catalogs/users must never inherit a
// restriction merely because they have a reverse relation to production orders.
const ownership = new Map<string, string[]>();
ownership.set('ProductionOrders', []);
for (const model of models.values()) {
  if (model.fields.some((field) => field.name === 'production_order_id')) {
    ownership.set(model.name, ['production_order_id']);
  }
}
let added: boolean;
do {
  added = false;
  for (const model of models.values()) {
    if (ownership.has(model.name)) continue;
    const parent = model.fields.find(
      (field) =>
        field.kind === 'object' &&
        !field.isList &&
        field.relationFromFields?.length &&
        ownership.has(field.type),
    );
    if (parent) {
      ownership.set(model.name, [parent.name, ...ownership.get(parent.type)!]);
      added = true;
    }
  }
} while (added);

export function productionOrderModelWhere(
  model: string,
  ids: number[],
): QueryArgs | null {
  const path = ownership.get(model);
  if (!path) return null;
  if (!path.length) return { id: { in: ids } };
  const build = (index: number): QueryArgs =>
    index === path.length - 1
      ? { [path[index]]: { in: ids } }
      : { [path[index]]: { is: build(index + 1) } };
  return build(0);
}

function intersect(where: QueryArgs | undefined, scope: QueryArgs): QueryArgs {
  // Keep unique selectors at the top level for findUnique/update/delete.
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
  args: QueryArgs,
  ids: number[],
): QueryArgs {
  const result = { ...args };
  for (const key of ['include', 'select']) {
    if (!args[key]) continue;
    const projection = { ...args[key] };
    for (const field of models.get(model)?.fields ?? []) {
      if (field.kind !== 'object' || !projection[field.name]) continue;
      const value = projection[field.name];
      let nested = value === true ? {} : value;
      const filter = productionOrderModelWhere(field.type, ids);
      // Prisma accepts where on list and optional to-one relation selections.
      if (filter && (field.isList || !field.isRequired)) {
        nested = { ...nested, where: intersect(nested.where, filter) };
      }
      projection[field.name] = scopeProjection(field.type, nested, ids);
    }
    if (projection._count) {
      const counts =
        projection._count === true
          ? Object.fromEntries(
              (models.get(model)?.fields ?? [])
                .filter((field) => field.kind === 'object' && field.isList)
                .map((field) => [field.name, true]),
            )
          : { ...projection._count.select };
      for (const field of models.get(model)?.fields ?? []) {
        if (!counts[field.name] || !field.isList) continue;
        const filter = productionOrderModelWhere(field.type, ids);
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

export function scopeProductionOrderQuery(
  model: string,
  args: QueryArgs,
  ids: number[],
) {
  const scoped = scopeProjection(model, args, ids);
  const filter = productionOrderModelWhere(model, ids);
  return filter ? { ...scoped, where: intersect(args.where, filter) } : scoped;
}

const filteredOperations = new Set([
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

export const productionOrderScopeExtension = Prisma.defineExtension((client) =>
  client.$extends({
    name: 'production-order-read-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!filteredOperations.has(operation)) return query(args);
          const queryArgs = (args ?? {}) as QueryArgs;
          // Catalog lookups without relation projections need no scope lookup.
          if (
            !ownership.has(model) &&
            !queryArgs.include &&
            !queryArgs.select
          ) {
            return query(args);
          }
          const scope = await getProductionOrderScope(client);
          if (scope.orderIds === null) return query(args);
          return (query as (value: any) => any)(
            scopeProductionOrderQuery(model, queryArgs, scope.orderIds),
          );
        },
      },
    },
  }),
);
