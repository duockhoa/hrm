"use client";

import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import usersService from "@/services/users.service";
import type { ApplicationUser } from "@/types/application";

export type DirectoryUser = ApplicationUser & { phone?: string | null };

// Mount this hook only in a screen or open form that needs the directory.
export function useUserDirectory() {
  return useSWR<DirectoryUser[]>(
    API_ROUTES.users.base,
    usersService.fetcherUsers,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );
}
