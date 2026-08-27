/** Permission keys used to authorize role and role-permission management routes. */
export const ROLE_PERMISSIONS = {
  LIST: 'roles.list',
  READ: 'roles.read',
  CREATE: 'roles.create',
  UPDATE: 'roles.update',
  DELETE: 'roles.delete',
  PERMISSIONS_ASSIGN: 'roles.permissions.assign',
} as const;
