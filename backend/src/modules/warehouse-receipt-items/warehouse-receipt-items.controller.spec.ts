import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { WarehouseReceiptReadGuard } from 'src/access/warehouse-receipt-scope';
import { WarehouseReceiptItemsController } from './warehouse-receipt-items.controller';

describe('Warehouse receipt item access', () => {
  const guard = new WarehouseReceiptReadGuard();
  const controller = WarehouseReceiptItemsController.prototype;

  function context(handler: () => unknown, permissions: string[] = []) {
    return {
      getHandler: () => handler,
      getClass: () => WarehouseReceiptItemsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 5, permissions } }),
      }),
    } as unknown as ExecutionContext;
  }

  it.each([
    ['listing', controller.findAll],
    ['reading', controller.findById],
    ['creating', controller.create],
    ['updating', controller.update],
    ['deleting', controller.delete],
  ])('enforces read scope for %s', (_operation, handler) => {
    const route = handler as () => unknown;
    expect(guard.canActivate(context(route))).toBe(false);
    expect(
      guard.canActivate(context(route, ['warehouse-receipt-items.read-own'])),
    ).toBe(true);
    expect(
      guard.canActivate(context(route, ['warehouse-receipt-items.read-all'])),
    ).toBe(true);
  });

  it('keeps JWT authentication required, including for listing', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, WarehouseReceiptItemsController),
    ).toEqual([jwtAuthGuard, WarehouseReceiptReadGuard]);
    expect(() =>
      new jwtAuthGuard().handleRequest(null, undefined, undefined),
    ).toThrow(UnauthorizedException);
  });
});
