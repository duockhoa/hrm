import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';
import { WAREHOUSE_RECEIPT_ITEM_PERMISSIONS as PERMISSIONS } from './warehouse-receipt-items.permissions';

describe('Warehouse receipt item access', () => {
  const guard = new PermissionsGuard(new Reflector());
  const controller = WarehouseReceiptItemsController.prototype;

  function context(handler: () => unknown, permissions: string[] = []) {
    return {
      getHandler: () => handler,
      getClass: () => WarehouseReceiptItemsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext;
  }

  it('allows listing for a logged-in user with no permissions', () => {
    expect(guard.canActivate(context(controller.findAll))).toBe(true);
  });

  it.each([
    [controller.findById, PERMISSIONS.READ],
    [controller.create, PERMISSIONS.CREATE],
    [controller.update, PERMISSIONS.UPDATE],
    [controller.delete, PERMISSIONS.DELETE],
  ])(
    'continues to enforce permission %s for other operations',
    (handler, permission) => {
      const route = handler as () => unknown;
      expect(guard.canActivate(context(route))).toBe(false);
      expect(guard.canActivate(context(route, [permission]))).toBe(true);
    },
  );

  it('keeps JWT authentication required, including for listing', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, WarehouseReceiptItemsController),
    ).toContain(jwtAuthGuard);
    expect(() =>
      new jwtAuthGuard().handleRequest(null, undefined, undefined),
    ).toThrow(UnauthorizedException);
  });
});
