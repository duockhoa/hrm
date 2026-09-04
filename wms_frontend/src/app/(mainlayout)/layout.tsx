"use client";

import ApplicationAccessGuard from "@/components/application-access-guard/application-access-guard";
import Header from "@/components/header/header";
import Sidebar from "@/components/sidebar/sidebar";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { usersService } from "@/services/index.service";
import { useSidebarStore } from "@/store/sidebar-store";
import useUsersStore from "@/store/users.store";
import { Boxes } from "lucide-react";
import { useEffect } from "react";
import useSWR from "swr";

const menuItems = [
  {
    id: "1",
    name: "Lô bán thành phẩm",
    icon: <Boxes className="size-5 shrink-0" />,
    url: "/home",
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
  }, [isMobile, toggleSidebar]);

  const { setUsers, setIsLoading } = useUsersStore();
  const { data: users, isLoading } = useSWR(
    API_ROUTES.users.base,
    usersService.fetcherUsers,
  );

  useEffect(() => {
    if (isLoading) {
      setIsLoading(true);
    }
    if (users) {
      setUsers(users);
      setIsLoading(false);
    }
  }, [users, isLoading, setIsLoading, setUsers]);

  return (
    <ApplicationAccessGuard>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={isOpen} data={menuItems} isMobile={isMobile} />
          <div className="flex-1 overflow-auto bg-blue-50 p-2">{children}</div>
        </div>
      </div>
    </ApplicationAccessGuard>
  );
}
