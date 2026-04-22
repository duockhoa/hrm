import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// department fetcher
const fetcherDepartments = async () => {
  const response = await axiosClient.get(API_ROUTES.departments.base);
  return response.data;
};

const fetcherDepartmentByName = async (name: string) => {
  const response = await axiosClient.get(
    `${API_ROUTES.departments.base}/${name}`,
  );

  return response.data;
};

const createDepartment = async (data: {
  name: string;
  description?: string;
  company_id?: number;
  team_lead?: number;
}) => {
  const response = await axiosClient.post(API_ROUTES.departments.base, data);
  return response.data;
};

const deleteDepartment = async (id: string) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.departments.base}/${id}`,
  );
  return response.data;
};

const updateDepartment = async (
  id: string,
  data: {
    name: string;
    description?: string;
    company_id?: number;
    team_lead?: number;
  },
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.departments.base}/${id}`,
    data,
  );
  return response.data;
};

export default {
  fetcherDepartments,
  fetcherDepartmentByName,
  createDepartment,
  deleteDepartment,
  updateDepartment,
};
