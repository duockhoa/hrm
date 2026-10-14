"use client";

import { API_ROUTES } from "@/lib/api-routes";
import emailSettingsService, {
  type EmailRecipientConfiguration,
  type EmailTypeWithDefaults,
} from "@/services/email-settings.service";
import usersService from "@/services/users.service";
import useSWR from "swr";

export default function useEmailSettings() {
  const {
    data: permissions,
    error: permissionsError,
    isLoading: permissionsLoading,
  } = useSWR(
    `${API_ROUTES.users.me}/permissions`,
    usersService.fetcherMyPermissionKeys,
  );
  const canManage =
    permissions?.permissionKeys.includes("email-settings.manage") ?? false;
  const {
    data: emailTypes = [],
    error,
    isLoading,
    mutate,
  } = useSWR<EmailTypeWithDefaults[]>(
    canManage ? API_ROUTES.emailSettings.defaults : null,
    emailSettingsService.fetchDefaults,
  );
  const updateRecipients = async (
    configuration: EmailRecipientConfiguration,
  ) => {
    await mutate(
      (current) =>
        current?.map((type) =>
          type.id === configuration.email_type_id
            ? {
                ...type,
                defaultRecipients: configuration.email ? configuration : null,
              }
            : type,
        ),
      { revalidate: false },
    );
  };
  const addType = async (emailType: EmailTypeWithDefaults) => {
    await mutate((current) => [...(current ?? []), emailType], {
      revalidate: false,
    });
  };
  return {
    emailTypes,
    canManage,
    isLoading: permissionsLoading || isLoading,
    error: permissionsError || error,
    updateRecipients,
    addType,
  };
}
