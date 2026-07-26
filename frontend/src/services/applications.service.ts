import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

type ApplicationPayload = {
  key: string;
  name: string;
  description?: string;
  default_order?: number;
  is_active?: boolean;
};

const fetcherApplications = async (includeInactive = true) => {
  const response = await axiosClient.get(API_ROUTES.applications.base, {
    params: { includeInactive },
  });
  return response.data;
};

const createApplication = async (data: ApplicationPayload) => {
  const response = await axiosClient.post(API_ROUTES.applications.base, data);
  return response.data;
};

const updateApplication = async (
  applicationId: number,
  data: Partial<ApplicationPayload>,
) => {
  const response = await axiosClient.patch(
    `${API_ROUTES.applications.base}/${applicationId}`,
    data,
  );
  return response.data;
};

const deleteApplication = async (applicationId: number) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.applications.base}/${applicationId}`,
  );
  return response.data;
};

export default {
  fetcherApplications,
  createApplication,
  updateApplication,
  deleteApplication,
};
