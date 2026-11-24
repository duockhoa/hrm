"use client";

import useSWR, { mutate } from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import usersService from "@/services/users.service";
import type { ApplicationUser } from "@/types/application";

export type DirectoryUser = ApplicationUser & {
  phone?: string | null;
  deleted_at?: string | null;
};

export function refreshUserDirectories() {
  return mutate(
    (key) =>
      key === API_ROUTES.users.base || key === API_ROUTES.users.withDeleted,
  );
}

// Mount this hook only in a screen or open form that needs the directory.
export function useUserDirectory(includeDeleted = false) {
  return useSWR<DirectoryUser[]>(
    includeDeleted ? API_ROUTES.users.withDeleted : API_ROUTES.users.base,
    usersService.fetcherUsers,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );
}
