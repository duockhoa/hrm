import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  EmailType,
  PersonalEmailRecipients,
} from "@/features/personal-email-settings/types";

const fetchTypes = async (): Promise<EmailType[]> => {
  const response = await axiosClient.get<EmailType[]>(
    API_ROUTES.emailSettings.types,
  );
  return response.data.filter(
    (type) => type.code !== "production_order_deviation_created",
  );
};

const fetchPersonal = async (): Promise<PersonalEmailRecipients[]> => {
  const response = await axiosClient.get(API_ROUTES.emailSettings.me);
  return response.data;
};

const savePersonal = async (
  emailTypeId: number,
  email: string,
): Promise<PersonalEmailRecipients> => {
  const response = await axiosClient.put(
    API_ROUTES.emailSettings.personal(emailTypeId),
    { email },
  );
  return response.data;
};

const deletePersonal = async (
  emailTypeId: number,
): Promise<PersonalEmailRecipients> => {
  const response = await axiosClient.delete(
    API_ROUTES.emailSettings.personal(emailTypeId),
  );
  return response.data;
};

const personalEmailSettingsService = {
  fetchTypes,
  fetchPersonal,
  savePersonal,
  deletePersonal,
};
export default personalEmailSettingsService;
