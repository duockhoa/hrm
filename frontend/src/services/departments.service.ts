import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// department fetcher
const fetcherDepartments = async () => {
  const response = await axiosClient.get(API_ROUTES.departments.base);
  return response.data;
};

const createDepartment = async (data: {
  name: string;
  description?: string;
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

export default { fetcherDepartments, createDepartment };
