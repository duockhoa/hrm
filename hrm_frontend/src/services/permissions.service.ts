import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetcherPermissions = async () => {
  const response = await axiosClient.get(API_ROUTES.permissions.base);
  return response.data;
};

const createPermission = async (data: {
  name: string;
  description?: string;
}) => {
  const response = await axiosClient.post(API_ROUTES.permissions.base, data);
  return response.data;
};

const updatePermission = async (
  id: number,
  data: { name?: string; description?: string },
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.permissions.base}/${id}`,
    data,
  );
  return response.data;
};

const deletePermission = async (id: number) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.permissions.base}/${id}`,
  );
  return response.data;
};

const permissionsService = {
  fetcherPermissions,
  createPermission,
  updatePermission,
  deletePermission,
};

export default permissionsService;
