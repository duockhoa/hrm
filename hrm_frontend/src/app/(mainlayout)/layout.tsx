"use client";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useSidebarStore } from "@/store/sidebar-store";
import useMobile from "@/hooks/use-mobile";
import { useEffect } from "react";
import {
  MdAdminPanelSettings,
  MdApps,
  MdBusiness,
  MdHistory,
  MdKey,
  MdPerson,
} from "react-icons/md";
import useUsersStore from "@/store/users.store";
import useDepartmentStore from "@/store/department.store";
import useCompanyStore from "@/store/companies.store";
import useSWR from "swr";
import {
  departmentsService,
  usersService,
  companiesService,
} from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";
import ApplicationAccessGuard from "@/components/applications/application-access-guard";
const data = [
  {
    id: "1",
    name: "Danh sách nhân sự",
    icon: <MdPerson />,
    url: "/home",
  },
  {
    id: "2",
    name: "Danh sách phòng ban",
    icon: <MdBusiness />,
    url: "/department",
  },
  {
    id: "3",
    name: "Danh sách công ty",
    icon: <MdBusiness />,
    url: "/company",
  },
  {
    id: "4",
    name: "Ứng dụng",
    icon: <MdApps />,
    url: "/applications",
  },
  {
    id: "5",
    name: "Vai trò",
    icon: <MdAdminPanelSettings />,
    url: "/roles",
  },
  {
    id: "6",
    name: "Phân quyền",
    icon: <MdKey />,
    url: "/setting",
  },
  {
    id: "7",
    name: "Lịch sử đăng nhập",
    icon: <MdHistory />,
    url: "/login-history",
  },
];

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ApplicationAccessGuard>
      <MainLayoutContent>{children}</MainLayoutContent>
    </ApplicationAccessGuard>
  );
}

function MainLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

  const { setDepartments, setIsLoading: setDepartmentsLoading } =
    useDepartmentStore();
  const { setCompanies, setIsLoading: setCompaniesLoading } = useCompanyStore();

  const { data: departments, isLoading: isDepartmentsLoading } = useSWR(
    API_ROUTES.departments.base,
    departmentsService.fetcherDepartments,
  );
  useEffect(() => {
    setDepartmentsLoading(isDepartmentsLoading);
    if (departments) {
      setDepartments(departments);
      setDepartmentsLoading(false);
    }
  }, [departments, isDepartmentsLoading]);

  const { data: companies, isLoading: isCompaniesLoading } = useSWR(
    API_ROUTES.companies.base,
    companiesService.fetcherCompanies,
  );
  useEffect(() => {
    setCompaniesLoading(isCompaniesLoading);
    if (companies) {
      setCompanies(companies);
      setCompaniesLoading(false);
    }
  }, [companies, isCompaniesLoading]);

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
        <Sidebar isOpen={isOpen} data={data} isMobile={isMobile} />
        <div className="flex-1 overflow-auto p-2 bg-blue-50">{children}</div>
      </div>
    </div>
  );
}
