/** Permission keys used to authorize production-order date-check routes. */
export const PRODUCTION_ORDER_DATE_CHECK_PERMISSIONS = {
  READ: 'production-orders.date-checks.read',
  CREATE: 'production-orders.date-checks.create',
  UPDATE: 'production-orders.date-checks.update',
  DELETE: 'production-orders.date-checks.delete',
} as const;
