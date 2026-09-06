/** Permission keys used to authorize production-workshop management routes. */
export const PRODUCTION_WORKSHOP_PERMISSIONS = {
  LIST: 'production-workshops.list',
  READ: 'production-workshops.read',
  CREATE: 'production-workshops.create',
  UPDATE: 'production-workshops.update',
  DELETE: 'production-workshops.delete',
  PRESSURE_DIFFERENTIAL_CREATE: 'production-workshops.pressure-differentials.create',
  PRESSURE_DIFFERENTIAL_UPDATE: 'production-workshops.pressure-differentials.update',
  PRESSURE_DIFFERENTIAL_DELETE: 'production-workshops.pressure-differentials.delete',
} as const;
