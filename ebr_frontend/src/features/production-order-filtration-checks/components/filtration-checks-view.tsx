"use client";

import { useState } from "react";
import useSWR from "swr";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { FiltrationCheck } from "../types";
import FiltrationCheckDetail from "./filtration-check-detail";
import FiltrationCheckForm from "./filtration-check-form";

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

export default function FiltrationChecksView({
  id,
  onClose,
  embedded = false,
  onSelectCheck,
}: {
  id: string | number;
  onClose?: () => void;
  embedded?: boolean;
  onSelectCheck?: (checkId: string | number) => void;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState<string | number | null>(null);
  const key = id ? API_ROUTES.productionOrders.filtrationChecks(id) : null;
  const { data, error, isLoading } = useSWR<FiltrationCheck[]>(key, () =>
    productionOrdersService.fetchFiltrationChecks(id),
  );

  if (selectedCheckId !== null) {
    return <FiltrationCheckDetail id={selectedCheckId} onClose={() => setSelectedCheckId(null)} />;
  }

  return (
    <div className="w-full max-w-4xl min-w-0 rounded border bg-white p-4 shadow-md">
      {!embedded && onClose ? (
        <DetailPanelHeader
          title="Theo dõi quá trình lọc"
          subtitle={`Lệnh sản xuất #${id}`}
          actions={<Button type="button" size="sm" onClick={() => setIsAddOpen(true)}><Plus className="size-4" />Thêm mới</Button>}
          onClose={onClose}
        />
      ) : null}
      {!embedded ? (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto md:max-w-3xl">
            <DialogHeader><DialogTitle>Thêm kiểm tra quá trình lọc</DialogTitle></DialogHeader>
            <FiltrationCheckForm productionOrderId={id} onClose={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      ) : null}
      {embedded ? (
        <div className="mb-4 mt-4 flex items-center gap-3"><h2 className="text-lg font-semibold">Theo dõi quá trình lọc</h2>{data ? <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">{data.length}</span> : null}</div>
      ) : <div className="mt-4" />}
      {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : null}
      {error ? <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không thể tải dữ liệu theo dõi quá trình lọc.</div> : null}
      {!isLoading && !error && data?.length === 0 ? <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">Chưa có dữ liệu theo dõi quá trình lọc.</div> : null}
      {!isLoading && !error && data && data.length > 0 ? (
        <div className="max-h-[60vh] divide-y divide-gray-200 overflow-auto rounded border">
          {data.map((item) => (
            <button key={item.id} type="button" className="flex w-full min-h-[78px] gap-3 bg-white p-3 text-left transition-colors hover:bg-gray-50" onClick={() => onSelectCheck ? onSelectCheck(item.id) : setSelectedCheckId(item.id)}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600"><Filter className="size-5" /></div>
              <div className="min-w-0 flex-1"><p className="font-semibold text-gray-900">{item.filter_position || "Phiếu kiểm tra quá trình lọc"}</p><p className="mt-1 text-sm text-gray-600">{item.filterMembrane?.filter_code ?? "Chưa chọn màng lọc"}{item.filterMembrane?.filter_type ? ` · ${item.filterMembrane.filter_type}` : ""}</p></div>
              <p className="text-right text-sm text-gray-600">{formatDateTime(item.filtering_started_at)}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
