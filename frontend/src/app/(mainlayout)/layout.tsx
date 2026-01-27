"use client";
import Header from "@/components/header/header";
import Sidebar from "@/components/sidebar/sidebar";
import { useSidebarStore } from "@/store/sidebar-store";
import useMobile from "@/hooks/use-mobile";
import { useEffect } from "react";
import { MdHome, MdPerson, MdCalendarToday, MdWork } from "react-icons/md";
import axiosClient from "@/lib/axios-client";
import useUsersStore from "@/store/users.store";
import useDepartmentStore from "@/store/department.store";
import useSWR from "swr";
import { API_ROUTES } from "@/lib/api-routes";
const data = [
  {
    id: "1",
    name: "Danh sách nhân sự",
    icon: <MdHome />,
    url: "/home",
  },
  {
    id: "2",
    name: "Danh sách phòng ban",
    icon: <MdHome />,
    url: "/department",
  },
  {
    id: "3",
    name: "Quản lý ngày phép",
    icon: <MdCalendarToday />,
    url: "/leave",
  },
  {
    id: "4",
    name: "Quản lý hợp đồng",
    icon: <MdWork />,
    url: "/contract",
  },
  {
    id: "5",
    name: "Tuyển dụng",
    icon: <MdPerson />,
    url: "/recruitment",
  },
];

export default function MainLayout({
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
  const fetcher = async (url: string) => {
    const response = await axiosClient.get(url);
    return response.data;
  };
  const { setUsers, setIsLoading } = useUsersStore();
  const {
    data: users,
    error,
    isLoading,
  } = useSWR(API_ROUTES.users.base, fetcher);

  const { setDepartments } = useDepartmentStore();

  const { data: departments } = useSWR("/departments", fetcher);

  useEffect(() => {
    if (departments) {
      setDepartments(departments);
    }
  }, [departments]);

  useEffect(() => {
    if (isLoading) {
      setIsLoading(true);
    }
    if (users) {
      setUsers(users);
      setIsLoading(false);
    }
  }, [users]);

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
