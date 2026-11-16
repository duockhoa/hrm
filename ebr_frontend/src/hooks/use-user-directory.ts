"use client";

import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import usersService from "@/services/users.service";

type DirectoryUser = {
  id: number;
  name: string;
  username: string;
  email?: string | null;
};

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
