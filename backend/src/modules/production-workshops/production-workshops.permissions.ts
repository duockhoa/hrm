/** Permission keys used to authorize production-workshop management routes. */
export const PRODUCTION_WORKSHOP_PERMISSIONS = {
  LIST: 'production-workshops.list',
  READ: 'production-workshops.read',
  CREATE: 'production-workshops.create',
  UPDATE: 'production-workshops.update',
  DELETE: 'production-workshops.delete',
} as const;
