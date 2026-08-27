export type Permission = {
  id: number;
  name: string;
  description?: string | null;
};

export type RolePermission = {
  id?: number;
  permission_id?: number;
  permissions?: Permission | null;
};

export type Role = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  rolePermissions?: RolePermission[];
};
