/** Permission keys used to authorize administrative user routes. */
export const USER_PERMISSIONS = {
  LIST: 'users.list',
  LIST_DELETED: 'users.list.deleted',
  READ: 'users.read',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  DELETE: 'users.delete',
  ROLES_READ: 'users.roles.read',
  ROLES_ASSIGN: 'users.roles.assign',
  APPLICATIONS_READ: 'users.applications.read',
  APPLICATIONS_ASSIGN: 'users.applications.assign',
  PERMISSIONS_READ: 'users.permissions.read',
} as const;
