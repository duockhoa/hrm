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
  CLEANING_CHECKLIST_READ: 'production-workshops.cleaning-checklists.read',
  CLEANING_CHECKLIST_CREATE: 'production-workshops.cleaning-checklists.create',
  CLEANING_CHECKLIST_UPDATE: 'production-workshops.cleaning-checklists.update',
  CLEANING_CHECKLIST_DELETE: 'production-workshops.cleaning-checklists.delete',
} as const;
