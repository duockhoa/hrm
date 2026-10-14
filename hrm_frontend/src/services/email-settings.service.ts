import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type EmailRecipientConfiguration = {
  id?: number;
  email_type_id: number;
  email: string;
};

export type EmailTypeWithDefaults = {
  id: number;
  code: string;
  name: string;
  defaultRecipients: EmailRecipientConfiguration | null;
};

const fetchDefaults = async (): Promise<EmailTypeWithDefaults[]> => {
  const response = await axiosClient.get(API_ROUTES.emailSettings.defaults);
  return response.data;
};

const saveDefault = async (
  emailTypeId: number,
  email: string,
): Promise<EmailRecipientConfiguration> => {
  const response = await axiosClient.put(
    `${API_ROUTES.emailSettings.types}/${emailTypeId}/default`,
    { email },
  );
  return response.data;
};

const deleteDefault = async (
  emailTypeId: number,
): Promise<EmailRecipientConfiguration> => {
  const response = await axiosClient.delete(
    `${API_ROUTES.emailSettings.types}/${emailTypeId}/default`,
  );
  return response.data;
};

const createType = async (data: {
  code: string;
  name: string;
}): Promise<EmailTypeWithDefaults> => {
  const response = await axiosClient.post(API_ROUTES.emailSettings.types, data);
  return { ...response.data, defaultRecipients: null };
};

const emailSettingsService = {
  fetchDefaults,
  saveDefault,
  deleteDefault,
  createType,
  addDefaultEmail: async (
    emailTypeId: number,
    email: string,
  ): Promise<EmailRecipientConfiguration> => {
    const response = await axiosClient.post(
      `${API_ROUTES.emailSettings.types}/${emailTypeId}/default/recipients`,
      { email },
    );
    return response.data;
  },
  updateDefaultEmail: async (
    emailTypeId: number,
    email: string,
    newEmail: string,
  ): Promise<EmailRecipientConfiguration> => {
    const response = await axiosClient.patch(
      `${API_ROUTES.emailSettings.types}/${emailTypeId}/default/recipients`,
      { email, newEmail },
    );
    return response.data;
  },
  deleteDefaultEmail: async (
    emailTypeId: number,
    email: string,
  ): Promise<EmailRecipientConfiguration> => {
    const response = await axiosClient.delete(
      `${API_ROUTES.emailSettings.types}/${emailTypeId}/default/recipients`,
      { data: { email } },
    );
    return response.data;
  },
};

export default emailSettingsService;
