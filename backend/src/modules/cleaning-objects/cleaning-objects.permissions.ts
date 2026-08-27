/** Permission keys used to authorize cleaning-object management routes. */
export const CLEANING_OBJECT_PERMISSIONS = {
  LIST: 'cleaning-objects.list',
  READ: 'cleaning-objects.read',
  CREATE: 'cleaning-objects.create',
  UPDATE: 'cleaning-objects.update',
  DELETE: 'cleaning-objects.delete',
} as const;
