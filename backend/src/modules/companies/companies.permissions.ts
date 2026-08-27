/** Permission keys used to authorize company management routes. */
export const COMPANY_PERMISSIONS = {
  LIST: 'companies.list',
  READ: 'companies.read',
  CREATE: 'companies.create',
  UPDATE: 'companies.update',
  DELETE: 'companies.delete',
} as const;
