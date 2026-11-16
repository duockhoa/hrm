"use client";

import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import departmentsService from "@/services/departments.service";

type DirectoryDepartment = {
  name: string;
  description?: string | null;
  company?: { name: string } | null;
  team_lead_user?: { name: string } | null;
};

export function useDepartmentDirectory() {
  return useSWR<DirectoryDepartment[]>(
    API_ROUTES.departments.base,
    departmentsService.fetcherDepartments,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
}
