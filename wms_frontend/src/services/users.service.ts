import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

//users fetcher
const fetcherUsers = async () => {
  const response = await axiosClient.get(API_ROUTES.users.base);
  return response.data;
};
export default { fetcherUsers };
