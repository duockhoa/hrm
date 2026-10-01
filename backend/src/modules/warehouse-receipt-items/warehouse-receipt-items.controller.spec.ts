import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';

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

  it.each([
    ['listing', controller.findAll],
    ['reading', controller.findById],
    ['creating', controller.create],
    ['updating', controller.update],
    ['deleting', controller.delete],
  ])(
    'allows %s for a logged-in user with no permissions',
    (_operation, handler) => {
      const route = handler as () => unknown;
      expect(guard.canActivate(context(route))).toBe(true);
    },
  );

  it('keeps JWT authentication required, including for listing', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, WarehouseReceiptItemsController),
    ).toEqual([jwtAuthGuard]);
    expect(() =>
      new jwtAuthGuard().handleRequest(null, undefined, undefined),
    ).toThrow(UnauthorizedException);
  });
});
