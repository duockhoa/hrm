import { PrismaClient } from '@prisma/client';
import { auditContext } from '../audit/audit-context';
import {
  assertProductionOrderInScope,
  effectiveProductionOrderLimit,
  getProductionOrderScope,
  productionOrderScopeSql,
} from './production-order-scope';
import {
  productionOrderModelWhere,
  productionOrderScopeExtension,
  scopeProductionOrderQuery,
} from './production-order-scope.extension';

describe('production order visibility policy', () => {
  const role = (limit: number | null) => ({
    production_order_read_limit: limit,
  });
  it('takes the widest role and denies access without a role', () => {
    expect(effectiveProductionOrderLimit([])).toBe(0);
    expect(effectiveProductionOrderLimit([role(300), role(1000)])).toBe(1000);
    expect(effectiveProductionOrderLimit([role(300), role(null)])).toBeNull();
    expect(effectiveProductionOrderLimit([role(-1)])).toBe(0);
  });

  it('selects the latest 300 before business filters and shares one request snapshot', async () => {
    const ids = Array.from({ length: 300 }, (_, i) => 301 - i);
    const client = {
      userRoles: {
        findMany: jest.fn().mockResolvedValue([{ roles: role(300) }]),
      },
      productionOrders: {
        findMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
      },
    };
    await auditContext.run(
      { request: { user: { id: 7 } }, requestId: 'one' },
      async () => {
        const [first, second] = await Promise.all([
          getProductionOrderScope(client),
          getProductionOrderScope(client),
        ]);
        expect(first).toBe(second);
        expect(first.orderIds).toHaveLength(300);
        await expect(
          assertProductionOrderInScope(client, 2),
        ).resolves.toBeUndefined();
        await expect(assertProductionOrderInScope(client, 1)).rejects.toThrow(
          'Production order not found',
        );
      },
    );
    expect(client.productionOrders.findMany).toHaveBeenCalledTimes(1);
    expect(client.productionOrders.findMany).toHaveBeenCalledWith({
      select: { id: true },
      orderBy: [{ creation_date: 'desc' }, { id: 'desc' }],
      take: 300,
    });
    expect(client.userRoles.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 7, roles: { deleted_at: null } },
      }),
    );
    client.userRoles.findMany.mockResolvedValue([{ roles: role(null) }]);
    await auditContext.run(
      { request: { user: { id: 7 } }, requestId: 'two' },
      async () => {
        expect((await getProductionOrderScope(client)).orderIds).toBeNull();
      },
    );
    expect(client.userRoles.findMany).toHaveBeenCalledTimes(2);
  });

  it('does not constrain system jobs and isolates concurrent users', async () => {
    const client = {
      userRoles: {
        findMany: jest
          .fn()
          .mockImplementation(async ({ where }) =>
            where.user_id === 1 ? [{ roles: role(null) }] : [],
          ),
      },
      productionOrders: { findMany: jest.fn() },
    };
    expect((await getProductionOrderScope(client)).orderIds).toBeNull();
    const scopes = await Promise.all(
      [1, 2].map((id) =>
        auditContext.run(
          { request: { user: { id } }, requestId: String(id) },
          () => getProductionOrderScope(client),
        ),
      ),
    );
    expect(scopes.map((scope) => scope.orderIds)).toEqual([null, []]);
    expect(client.productionOrders.findMany).not.toHaveBeenCalled();
  });

  it('scopes deviations, image ownership, deeply nested parameters and optional previous orders', () => {
    expect(productionOrderModelWhere('ProductionOrderDeviations', [9])).toEqual(
      { production_order_id: { in: [9] } },
    );
    expect(
      productionOrderModelWhere('ProductionOrderDeviationImages', [9]),
    ).toEqual({
      deviation: { is: { production_order_id: { in: [9] } } },
    });
    expect(
      productionOrderModelWhere('ProductionOrderMixingRecordParameters', [9]),
    ).toHaveProperty(
      'mixingRecordStep.is.mixingRecordStage.is.mixingRecord.is.production_order_id.in',
      [9],
    );
    expect(productionOrderModelWhere('Items', [9])).toBeNull();
    expect(productionOrderModelWhere('Users', [9])).toBeNull();
    const result = scopeProductionOrderQuery(
      'ProductionOrderLineClearanceChecks',
      {
        where: { id: 10 },
        include: { previousProductionOrder: { select: { lot_no: true } } },
      },
      [9],
    );
    expect(result.include.previousProductionOrder.where.AND).toEqual([
      { id: { in: [9] } },
    ]);
  });

  it('scopes nested lists and relation counts without replacing existing filters', () => {
    const result = scopeProductionOrderQuery(
      'Items',
      {
        where: { item_code: 'TP001' },
        include: {
          productionOrders: { where: { status: 'released' } },
          _count: { select: { productionOrders: true } },
        },
      },
      [9],
    );
    expect(result.where).toEqual({ item_code: 'TP001' });
    expect(result.include.productionOrders.where).toEqual({
      status: 'released',
      AND: [{ id: { in: [9] } }],
    });
    expect(result.include._count.select.productionOrders).toEqual({
      where: { AND: [{ id: { in: [9] } }] },
    });
    expect(productionOrderScopeSql([]).sql).toBe('1=0');
    expect(productionOrderScopeSql(null).sql).toBe('1=1');
  });
});

describe('Prisma scope extension', () => {
  // Intercept after the actual scope extension, before database I/O.
  const query = jest.fn(({ args }: { args: unknown }) => Promise.resolve(args));
  const client = new PrismaClient()
    .$extends(productionOrderScopeExtension)
    .$extends({
      query: { $allModels: { $allOperations: query } },
    });
  const run = (callback: () => PromiseLike<unknown>) =>
    auditContext.run(
      {
        request: { user: { id: 7 } },
        requestId: 'prisma',
        productionOrderScope: Promise.resolve({
          limit: 300,
          orderIds: [301, 300],
        }),
      },
      async () => await callback(),
    );

  afterAll(() => client.$disconnect());

  it('adds visibility before list pagination, count and lookup by ID', async () => {
    await run(() =>
      client.productionOrderDeviations.findMany({
        where: { deleted_at: null },
        skip: 20,
        take: 20,
      }),
    );
    expect(query.mock.calls.at(-1)?.[0].args).toMatchObject({
      where: {
        deleted_at: null,
        AND: [{ production_order_id: { in: [301, 300] } }],
      },
      skip: 20,
      take: 20,
    });
    await run(() => client.productionOrderDeviations.count());
    expect(query.mock.calls.at(-1)?.[0].args).toMatchObject({
      where: { AND: [{ production_order_id: { in: [301, 300] } }] },
    });
    await run(() => client.productionOrders.findUnique({ where: { id: 1 } }));
    expect(query.mock.calls.at(-1)?.[0].args).toMatchObject({
      where: { id: 1, AND: [{ id: { in: [301, 300] } }] },
    });
  });

  it('blocks direct image lookup through the owning deviation', async () => {
    await run(() =>
      client.productionOrderDeviationImages.findFirst({
        where: { image_path: 'old.png' },
      }),
    );
    expect(query.mock.calls.at(-1)?.[0].args).toMatchObject({
      where: {
        image_path: 'old.png',
        AND: [
          { deviation: { is: { production_order_id: { in: [301, 300] } } } },
        ],
      },
    });
  });
});
