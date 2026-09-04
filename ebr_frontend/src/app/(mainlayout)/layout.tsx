"use client";

import ApplicationAccessGuard from "@/components/application-access-guard/application-access-guard";
import Header from "@/components/header/header";
import Sidebar from "@/components/sidebar/sidebar";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { usersService } from "@/services/index.service";
import { useSidebarStore } from "@/store/sidebar-store";
import useUsersStore from "@/store/users.store";
import {
  Boxes,
  ChartColumn,
  ClipboardList,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  Info,
  Layers3,
  ListChecks,
  ListTree,
  PackageCheck,
  PackageSearch,
  TriangleAlert,
} from "lucide-react";
import { useEffect } from "react";
import useSWR from "swr";

const data = [
  {
    id: "1",
    name: "Lô bán thành phẩm",
    icon: <Boxes className="size-5 shrink-0" />,
    url: "/home",
  },
  {
    id: "2",
    name: "Lô thành phẩm",
    icon: <PackageCheck className="size-5 shrink-0" />,
    url: "/finished-product-production-orders",
  },
  {
    id: "3",
    name: "Danh mục thành phẩm",
    icon: <ClipboardList className="size-5 shrink-0" />,
    url: "/finished-products",
  },
  {
    id: "4",
    name: "Danh mục bán thành phẩm",
    icon: <Layers3 className="size-5 shrink-0" />,
    url: "/semi-finished-products",
  },
  {
    id: "5",
    name: "Danh mục nguyên liệu",
    icon: <FlaskConical className="size-5 shrink-0" />,
    url: "/raw-materials",
  },
  {
    id: "7",
    name: "Kiểm tra chênh áp",
    icon: <Gauge className="size-5 shrink-0" />,
    url: "/pressure-differentials",
  },
  {
    id: "8",
    name: "Checklist vệ sinh xưởng",
    icon: <ClipboardCheck className="size-5 shrink-0" />,
    url: "/cleaning-checklists",
  },
  {
    id: "6",
    name: "Tổng hợp lô sản xuất",
    icon: <ListChecks className="size-5 shrink-0" />,
    url: "/product-orders",
  },
  {
    id: "finished-product-summaries",
    name: "Danh sách tổng kết thành phẩm",
    icon: <PackageSearch className="size-5 shrink-0" />,
    url: "/finished-product-summaries",
  },
  {
    id: "9",
    name: "Sai lệch",
    icon: <TriangleAlert className="size-5 shrink-0" />,
    url: "/production-order-deviations",
  },
  {
    id: "filter-usage-records",
    name: "Sổ theo dõi sử dụng cột lọc",
    icon: <ListTree className="size-5 shrink-0" />,
    url: "/filter-usage-records",
  },
  {
    id: "10",
    name: "Báo cáo",
    icon: <ChartColumn className="size-5 shrink-0" />,
    url: "/reports",
  },
  {
    id: "11",
    name: "About",
    icon: <Info className="size-5 shrink-0" />,
    url: "/about",
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

  const { setUsers, setIsLoading } = useUsersStore();
  const {
    data: users,
    error,
    isLoading,
  } = useSWR(API_ROUTES.users.base, usersService.fetcherUsers);

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
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={isOpen} data={data} isMobile={isMobile} />
          <div className="flex-1 overflow-auto bg-blue-50 p-2">{children}</div>
        </div>
      </div>
    </ApplicationAccessGuard>
  );
}
