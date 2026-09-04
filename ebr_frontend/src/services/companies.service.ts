import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// company fetcher
const fetcherCompanies = async () => {
  const response = await axiosClient.get(API_ROUTES.companies.base);
  return response.data;
};
const createCompany = async (data: {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
}) => {
  const response = await axiosClient.post(API_ROUTES.companies.base, data);
  return response.data;
};

const updateCompany = async (
  id: number,
  data: {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    team_lead?: number;
  },
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.companies.base}/${id}`,
    data,
  );
  return response.data;
};

const deleteCompany = async (id: string) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.companies.base}/${id}`,
  );
  return response.data;
};

export default {
  fetcherCompanies,
  createCompany,
  deleteCompany,
  updateCompany,
};
