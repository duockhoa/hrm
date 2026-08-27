/** Permission keys used to authorize production-specification management routes. */
export const PRODUCTION_SPECIFICATION_PERMISSIONS = {
  LIST: 'production-specifications.list',
  READ: 'production-specifications.read',
  CREATE: 'production-specifications.create',
  UPDATE: 'production-specifications.update',
  DELETE: 'production-specifications.delete',
} as const;
