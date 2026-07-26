import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

//users fetcher
const fetcherUsers = async () => {
  const response = await axiosClient.get(API_ROUTES.users.base);
  return response.data;
};

const fetcherUserRoles = async (userId: number) => {
  const response = await axiosClient.get(
    `${API_ROUTES.users.base}/${userId}/roles`,
  );
  return response.data;
};

const syncUserRoles = async (userId: number, roleIds: number[]) => {
  const response = await axiosClient.put(
    `${API_ROUTES.users.base}/${userId}/roles`,
    { roleIds },
  );
  return response.data;
};

const fetcherUserApplications = async (userId: number) => {
  const response = await axiosClient.get(
    `${API_ROUTES.users.base}/${userId}/applications`,
  );
  return response.data;
};

const syncUserApplications = async (
  userId: number,
  applicationIds: number[],
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.users.base}/${userId}/applications`,
    { applicationIds },
  );
  return response.data;
};

export default {
  fetcherUsers,
  fetcherUserRoles,
  syncUserRoles,
  fetcherUserApplications,
  syncUserApplications,
};
