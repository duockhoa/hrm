/** Permission keys used to authorize filter-catalog management routes. */
export const FILTER_CATALOG_PERMISSIONS = {
  LIST: 'filter-catalogs.list',
  READ: 'filter-catalogs.read',
  CREATE: 'filter-catalogs.create',
  UPDATE: 'filter-catalogs.update',
  DELETE: 'filter-catalogs.delete',
} as const;
