import { auditContext } from '../audit/audit-context';
import {
  currentWarehouseReceiptScope,
  warehouseReceiptScopeForUser,
} from './warehouse-receipt-scope';
import {
  scopeWarehouseReceiptQuery,
  warehouseReceiptModelWhere,
} from './warehouse-receipt-scope.extension';

describe('Warehouse receipt permission scopes', () => {
  const own = { kind: 'own' as const, userId: 5 };
  it('prioritizes read-all over read-own', () => {
    expect(
      warehouseReceiptScopeForUser({
        id: 5,
        permissions: [
          'warehouse-receipt-items.read-all',
          'warehouse-receipt-items.read-own',
        ],
      }),
    ).toEqual({ kind: 'all' });
  });
  it('resolves permissions assigned through roles', () => {
    expect(
      warehouseReceiptScopeForUser({
        id: 5,
        userRoles: [
          {
            roles: {
              rolePermissions: [
                { permissions: { name: 'warehouse-receipt-items.read-own' } },
              ],
            },
          },
        ],
      }),
    ).toEqual(own);
  });
  it('ignores deleted roles', () => {
    expect(
      warehouseReceiptScopeForUser({
        id: 5,
        userRoles: [
          {
            roles: {
              deleted_at: new Date(),
              rolePermissions: [
                { permissions: { name: 'warehouse-receipt-items.read-all' } },
              ],
            },
          },
        ],
      }),
    ).toEqual({ kind: 'none' });
  });
  it.each([
    undefined,
    { id: 5 },
    { id: 0, permissions: ['warehouse-receipt-items.read-all'] },
  ])('denies missing/invalid permissions %p', (user) => {
    expect(warehouseReceiptScopeForUser(user)).toEqual({ kind: 'none' });
  });
  it('does not restrict background jobs without a user request', () => {
    expect(currentWarehouseReceiptScope()).toEqual({ kind: 'all' });
  });
  it('uses the authenticated request user for its entire lifetime', () => {
    const user = { id: 5, permissions: ['warehouse-receipt-items.read-own'] };
    auditContext.run({ request: { user }, requestId: 'scope-test' }, () => {
      expect(currentWarehouseReceiptScope()).toEqual(own);
    });
  });
  it('intersects search and unique ID selectors with the owner, rather than replacing them', () => {
    const query = scopeWarehouseReceiptQuery(
      'WarehouseReceiptItems',
      {
        where: { id: 9, AND: [{ lot_number: { contains: 'A' } }] },
        skip: 20,
        take: 20,
      },
      own,
    );
    expect(query).toEqual({
      where: {
        id: 9,
        AND: [{ lot_number: { contains: 'A' } }, { entered_by_id: 5 }],
      },
      skip: 20,
      take: 20,
    });
  });
  it.each([
    'WarehouseReceiptItemAttachments',
    'WarehouseReceiptItemSapConfirmations',
    'WarehouseReceiptItemSamplingRequests',
  ])(
    'scopes child records and file lookups through their receipt: %s',
    (model) => {
      expect(warehouseReceiptModelWhere(model, own)).toEqual({
        receipt: { is: { entered_by_id: 5 } },
      });
    },
  );
  it('filters nested item history and counts without hiding shared catalog entries', () => {
    const query = scopeWarehouseReceiptQuery(
      'Items',
      {
        where: { item_code: 'NL1' },
        include: {
          warehouseReceiptItems: true,
          _count: { select: { warehouseReceiptItems: true } },
        },
      },
      own,
    );
    expect(query.where).toEqual({ item_code: 'NL1' });
    expect(query.include.warehouseReceiptItems.where).toEqual({
      AND: [{ entered_by_id: 5 }],
    });
    expect(query.include._count.select.warehouseReceiptItems.where).toEqual({
      AND: [{ entered_by_id: 5 }],
    });
  });
  it('scopes raw drafts while preserving finished drafts and their separate permissions', () => {
    expect(
      warehouseReceiptModelWhere(
        'WarehouseReceiptItemSamplingRequestDrafts',
        own,
      ),
    ).toEqual({
      OR: [
        { request_type: 'TP' },
        { request_type: 'NL', receipt: { is: { entered_by_id: 5 } } },
      ],
    });
    expect(
      warehouseReceiptModelWhere('WarehouseReceiptItemSamplingRequestDrafts', {
        kind: 'none',
      }),
    ).toMatchObject({
      OR: [
        { request_type: 'TP' },
        { request_type: 'NL', receipt: { is: { id: { in: [] } } } },
      ],
    });
  });
});
