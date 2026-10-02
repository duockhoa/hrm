"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import itemsService from "@/services/items.service";
import ItemsPage from "./items-page";
import type { Item } from "./types";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const { data, error, isLoading, mutate } = useSWR<Item | null>(
    `${API_ROUTES.items.base}/${encodeURIComponent(id)}`,
    () => itemsService.fetchItemById(encodeURIComponent(id)),
  );

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel defaultSize={isTablet ? "25%" : "30%"} minSize={isTablet ? "20%" : "30%"} className="min-h-0 min-w-0 overflow-hidden">
            <ItemsPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel defaultSize={isMobile ? "100%" : isTablet ? "75%" : "70%"} minSize={0} className="min-h-0 min-w-0 overflow-auto p-4">
          <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link className="shrink-0" href="/items">Danh sách nguyên liệu</Link>
              <AiOutlineRight className="shrink-0" />
              <p className="truncate">{data?.item_code ?? id}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => router.push("/items")} aria-label="Đóng chi tiết hàng hóa">
              <X className="size-5" />
            </Button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4">
            {isLoading ? (
              <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
                <Skeleton className="mx-auto h-10 w-3/4" />
                <div className="mt-6 space-y-4">
                  {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-5 w-full" />)}
                </div>
              </div>
            ) : error ? (
              <div role="alert" className="p-4 text-center text-sm text-red-600">
                <p>Không thể tải thông tin hàng hóa.</p>
                <Button variant="outline" className="mt-2" onClick={() => void mutate()}>Thử lại</Button>
              </div>
            ) : data ? (
              <div className="flex w-full max-w-4xl flex-col gap-4 rounded border bg-white p-4 shadow-md">
                <h1 className="wrap-anywhere text-center text-4xl font-bold text-blue-500">{data.item_code} - {data.item_name}</h1>
                <div className="border-t border-gray-300 py-2" />
                <FieldDisplay lable="Mã hàng hóa" value={data.item_code} />
                <FieldDisplay lable="Tên hàng hóa" value={data.item_name ?? ""} />
                <FieldDisplay lable="Mã DK" value={data.dk_code ?? ""} />
                <FieldDisplay lable="Đơn vị tính" value={data.unit ?? ""} />
                <FieldDisplay lable="Số đăng ký" value={[data.registration?.registration_number, data.registration?.product_name].filter(Boolean).join(" - ")} />
              </div>
            ) : (
              <p className="p-4 text-center text-sm text-gray-500">Không tìm thấy hàng hóa.</p>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
