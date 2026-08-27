import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetcherRoles = async () => {
  const response = await axiosClient.get(API_ROUTES.roles.base);
  return response.data;
};

const createRole = async (data: { name: string; description?: string }) => {
  const response = await axiosClient.post(API_ROUTES.roles.base, data);
  return response.data;
};

const updateRole = async (
  id: number,
  data: { name?: string; description?: string },
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.roles.base}/${id}`,
    data,
  );
  return response.data;
};

const deleteRole = async (id: number) => {
  const response = await axiosClient.delete(`${API_ROUTES.roles.base}/${id}`);
  return response.data;
};

const syncRolePermissions = async (roleId: number, permissionIds: number[]) => {
  const response = await axiosClient.put(
    `${API_ROUTES.roles.base}/${roleId}/permissions`,
    { permissionIds },
  );
  return response.data;
};

const rolesService = {
  fetcherRoles,
  createRole,
  updateRole,
  deleteRole,
  syncRolePermissions,
};

export default rolesService;
