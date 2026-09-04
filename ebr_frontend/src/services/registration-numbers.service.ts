import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type RegistrationNumber = {
  id: number;
  registration_number: string;
  product_name?: string | null;
};

const fetchRegistrationNumbers = async (): Promise<RegistrationNumber[]> => {
  const response = await axiosClient.get(API_ROUTES.registrationNumbers.base);
  return response.data;
};

const registrationNumbersService = {
  fetchRegistrationNumbers,
};

export default registrationNumbersService;
