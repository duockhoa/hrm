"use client";

import ApplicationAccessGuard from "@/components/application-access-guard/application-access-guard";
import Header from "@/components/header/header";
import Sidebar from "@/components/sidebar/sidebar";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { userService } from "@/services/index.service";
import { useSidebarStore } from "@/store/sidebar-store";
import {
  Boxes,
  ClipboardList,
  FilePenLine,
  Info,
  Package,
  PackageMinus,
  PackagePlus,
  PackageSearch,
  Thermometer,
  Unplug,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";

const menuItems = [
  {
    id: "1",
    name: "Kiểm hàng nhập kho",
    icon: <Boxes className="size-5 shrink-0" />,
    url: "/home",
  },
  {
    id: "sampling-request-drafts",
    name: "Danh sách gửi PYCLM",
    icon: <FilePenLine className="size-5 shrink-0" />,
    url: "/sampling-request-drafts",
  },
  {
    id: "warehouse-temperature-humidity-checks",
    name: "Kiểm tra nhiệt độ, độ ẩm kho",
    icon: <Thermometer className="size-5 shrink-0" />,
    url: "/warehouse-temperature-humidity-checks",
  },
  {
    id: "finished-product-summaries",
    name: "Danh sách tổng kết thành phẩm",
    icon: <PackageSearch className="size-5 shrink-0" />,
    url: "/finished-product-summaries",
  },
  {
    id: "items",
    name: "Danh sách nguyên liệu",
    icon: <Package className="size-5 shrink-0" />,
    url: "/items",
  },
  {
    id: "stocktakes",
    name: "Kiểm Kê",
    icon: <ClipboardList className="size-5 shrink-0" />,
    url: "/stocktakes",
  },
  {
    id: "purchase-goods-receipts",
    name: "Phiếu nhập kho hàng mua",
    icon: <PackagePlus className="size-5 shrink-0" />,
    url: "/purchase-goods-receipts",
  },
  {
    id: "warehouse-dispatches",
    name: "Phiếu xuất kho",
    icon: <PackageMinus className="size-5 shrink-0" />,
    url: "/warehouse-dispatches",
  },
  {
    id: "connection-history",
    name: "Lịch sử kết nối",
    icon: <Unplug className="size-5 shrink-0" />,
    url: "/connection-history",
  },
  {
    id: "about",
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
  const pathname = usePathname();
  const isConnectionHistoryPage = pathname === "/connection-history";
  const { isOpen, toggleSidebar } = useSidebarStore();
  const isMobile = useMobile();
  useEffect(() => {
    if (isMobile) {
      toggleSidebar();
    }
  }, [isMobile, toggleSidebar]);

  const { data: myPermissions } = useSWR(
    API_ROUTES.users.myPermissions,
    userService.fetchMyPermissions,
  );
  const menuData = menuItems.filter(
    (item) =>
      item.id !== "connection-history" ||
      myPermissions?.permissionKeys.includes("users.list"),
  );
  return (
    <ApplicationAccessGuard>
      <div className="flex h-dvh flex-col overflow-hidden">
        <Header />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar isOpen={isOpen} data={menuData} isMobile={isMobile} />
          <div
            className={`min-h-0 min-w-0 flex-1 bg-blue-50 p-2 ${isConnectionHistoryPage ? "overflow-hidden" : "overflow-auto"}`}
          >
            {children}
          </div>
        </div>
      </div>
    </ApplicationAccessGuard>
  );
}
