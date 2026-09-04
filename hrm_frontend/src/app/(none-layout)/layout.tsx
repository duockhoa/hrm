"use client";
import { useEffect } from "react";

import useUsersStore from "@/store/users.store";
import useDepartmentStore from "@/store/department.store";
import useCompanyStore from "@/store/companies.store";
import useSWR from "swr";
import Header from "@/components/layout/header";
import {
  departmentsService,
  usersService,
  companiesService,
} from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { setUsers, setIsLoading } = useUsersStore();
  const {
    data: users,
    error,
    isLoading,
  } = useSWR(API_ROUTES.users.base, usersService.fetcherUsers);

  const { setDepartments } = useDepartmentStore();
  const { setCompanies } = useCompanyStore();

  const { data: departments } = useSWR(
    API_ROUTES.departments.base,
    departmentsService.fetcherDepartments,
  );
  useEffect(() => {
    if (departments) {
      setDepartments(departments);
    }
  }, [departments]);

  const { data: companies } = useSWR(
    API_ROUTES.companies.base,
    companiesService.fetcherCompanies,
  );
  useEffect(() => {
    if (companies) {
      setCompanies(companies);
    }
  }, [companies]);

  useEffect(() => {
    if (isLoading) {
      setIsLoading(true);
    }
    if (users) {
      setUsers(users);
      setIsLoading(false);
    }
  }, [users, isLoading]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-2 bg-blue-50">{children}</div>
      </div>
    </div>
  );
}
