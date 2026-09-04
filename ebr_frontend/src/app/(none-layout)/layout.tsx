"use client";
import ApplicationAccessGuard from "@/components/application-access-guard/application-access-guard";
import { useSidebarStore } from "@/store/sidebar-store";
import useMobile from "@/hooks/use-mobile";
import { useEffect } from "react";

import useUsersStore from "@/store/users.store";
import useCompanyStore from "@/store/companies.store";
import useSWR from "swr";
import HeaderApps from "@/components/header-apps/header-apps";
import Header from "@/components/header/header";
import { usePathname } from "next/navigation";
import {
  usersService,
  companiesService,
} from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const usesMainHeader = pathname === "/profile";
  const { isOpen, toggleSidebar } = useSidebarStore();
  const isMobile = useMobile();
  useEffect(() => {
    if (isMobile) {
      toggleSidebar();
    }
  }, [isMobile]);

  const { setUsers, setIsLoading } = useUsersStore();
  const {
    data: users,
    error,
    isLoading,
  } = useSWR(API_ROUTES.users.base, usersService.fetcherUsers);

  const { setCompanies } = useCompanyStore();

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
    <ApplicationAccessGuard>
    <div className="flex h-screen flex-col">
      {usesMainHeader ? <Header /> : <HeaderApps />}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-2 bg-blue-50">{children}</div>
      </div>
    </div>
    </ApplicationAccessGuard>
  );
}
