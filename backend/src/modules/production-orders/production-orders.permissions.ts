/** Permission keys used to authorize production-order and nested resource routes. */
export const PRODUCTION_ORDER_PERMISSIONS = {
  LIST: 'production-orders.list',
  READ: 'production-orders.read',
  EXPORT: 'production-orders.export',
  EXPORT_WAREHOUSE_RELEASE: 'production-orders.export-warehouse-release',
  CREATE: 'production-orders.create',
  UPDATE: 'production-orders.update',
  DELETE: 'production-orders.delete',
} as const;
