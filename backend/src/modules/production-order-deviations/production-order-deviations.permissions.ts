/** Permission keys used to authorize production-order deviation management routes. */
export const PRODUCTION_ORDER_DEVIATION_PERMISSIONS = {
  LIST: 'production-order-deviations.list',
  READ: 'production-order-deviations.read',
  CREATE: 'production-order-deviations.create',
  UPDATE: 'production-order-deviations.update',
  DELETE: 'production-order-deviations.delete',
} as const;
