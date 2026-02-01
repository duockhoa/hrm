import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

// department fetcher
const fetcherDepartments = async () => {
  const response = await axiosClient.get(API_ROUTES.departments.base);
  return response.data;
};
export default { fetcherDepartments };
