"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { isAxiosError } from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProductionOrderMixingRecordDetail from "@/features/production-order-mixing-records/components/production-order-mixing-record-detail";
import ProductionOrderWeighingRecordDetail from "@/features/production-order-weighing-records/components/production-order-weighing-record-detail";
import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import { PRODUCTION_ORDER_DATA_CHANGED } from "@/lib/production-order-data-events";
import weighingService from "@/services/production-order-weighing-records.service";
import useSearchStore from "@/store/search.store";

const pageSize = 25;
const sentDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});
const queues = {
  mixing: {
    title: "Phiếu pha chế cần duyệt",
    path: "/pending-mixing-records",
    endpoint: API_ROUTES.productionOrders.pendingMixingRecords,
  },
  weighing: {
    title: "Phiếu cân cần duyệt",
    path: "/pending-weighing-records",
    endpoint: API_ROUTES.productionOrders.pendingWeighingRecords,
  },
};

type RecordKind = keyof typeof queues;
type PendingRecord = {
  id: number;
  description: string | null;
  qa_staff_approved_at: string | null;
  productionOrder: {
    id: number;
    production_order_code: string | null;
    item_code: string;
    lot_no: string;
    planned_quatity: number;
    unit: string;
    item: { item_name: string };
    samplingRequests: { sent_at: string }[];
  };
};

function WeighingDetail({
  row,
  onClose,
}: {
  row: PendingRecord;
  onClose: () => void;
}) {
  const { data, error, mutate } = useSWR(
    API_ROUTES.productionOrders.weighingRecordDetail(row.id),
    () => weighingService.fetchById(row.id),
  );
  if (data) {
    return (
      <ProductionOrderWeighingRecordDetail
        record={data}
        productionOrder={row.productionOrder}
        onClose={onClose}
      />
    );
  }
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4 text-sm">
      <Button type="button" variant="ghost" onClick={onClose}>
        <ArrowLeft /> Quay lại danh sách
      </Button>
      {error ? (
        <div role="alert">
          Không thể tải chi tiết phiếu cân.{" "}
          <Button type="button" variant="outline" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <p role="status">Đang tải phiếu cân...</p>
      )}
    </div>
  );
}

export default function PendingIpcRecordsPage({ kind }: { kind: RecordKind }) {
  const search = useSearchStore(
    (state) => state.searchByPath[queues[kind].path] ?? "",
  ).trim();
  return <PendingIpcRecords key={search} kind={kind} search={search} />;
}

function PendingIpcRecords({
  kind,
  search,
}: {
  kind: RecordKind;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PendingRecord>();
  const { title, endpoint } = queues[kind];
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    [endpoint, page, search] as const,
    async ([url, currentPage, keyword]) => {
      const response = await axiosClient.get<{
        data: PendingRecord[];
        total: number;
      }>(url, {
        params: {
          page: currentPage,
          limit: pageSize,
          search: keyword || undefined,
        },
      });
      return response.data;
    },
    {
      shouldRetryOnError: (error) =>
        !isAxiosError(error) || error.response?.status !== 403,
      onSuccess: ({ total }) => {
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        if (page > lastPage) setPage(lastPage);
      },
    },
  );

  useEffect(() => {
    const refresh = (event: Event) => {
      const url = (event as CustomEvent<{ url: string }>).detail.url;
      if (
        url.startsWith(`/production-orders/${kind}-records/`) ||
        url.endsWith("/sampling-requests")
      ) {
        void mutate();
      }
    };
    window.addEventListener(PRODUCTION_ORDER_DATA_CHANGED, refresh);
    return () =>
      window.removeEventListener(PRODUCTION_ORDER_DATA_CHANGED, refresh);
  }, [kind, mutate]);

  function closeDetail() {
    setSelected(undefined);
    void mutate();
  }

  if (selected) {
    return kind === "mixing" ? (
      <ProductionOrderMixingRecordDetail
        recordId={selected.id}
        productionOrder={selected.productionOrder}
        onClose={closeDetail}
      />
    ) : (
      <WeighingDetail row={selected} onClose={closeDetail} />
    );
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const forbidden = isAxiosError(error) && error.response?.status === 403;
  return (
    <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Đã gửi PYCLM · Chưa ký duyệt IPC
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isValidating || forbidden}
          onClick={() => void mutate()}
        >
          <RefreshCw className={isValidating ? "animate-spin" : undefined} />{" "}
          Làm mới
        </Button>
      </header>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="pl-4">Phiếu</TableHead>
            <TableHead>Mã lệnh</TableHead>
            <TableHead>Số lô</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Gửi PYCLM lúc</TableHead>
            <TableHead>Duyệt ĐBCL</TableHead>
            <TableHead className="sr-only">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {error || isLoading || !data?.data.length ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="whitespace-normal py-10 text-center text-muted-foreground"
              >
                <span role={error ? "alert" : "status"}>
                  {forbidden
                    ? "Bạn chưa có quyền xem danh sách phiếu."
                    : error
                      ? "Không thể tải danh sách phiếu. Vui lòng thử lại."
                      : isLoading
                        ? "Đang tải danh sách phiếu..."
                        : "Không có phiếu chờ IPC phù hợp."}
                </span>
              </TableCell>
            </TableRow>
          ) : (
            data.data.map((row) => {
              const order = row.productionOrder;
              const sentAt = order.samplingRequests[0]?.sent_at;
              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-64 whitespace-normal break-words py-3 pl-4">
                    <span className="font-medium">#{row.id}</span>
                    {row.description && (
                      <p className="text-muted-foreground">{row.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.production_order_code || order.id}
                  </TableCell>
                  <TableCell>{order.lot_no || "—"}</TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{order.item_code}</span>
                    <p className="text-muted-foreground">
                      {order.item.item_name}
                    </p>
                  </TableCell>
                  <TableCell>
                    {sentAt ? sentDateFormatter.format(new Date(sentAt)) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.qa_staff_approved_at ? "secondary" : "outline"
                      }
                    >
                      {row.qa_staff_approved_at ? "Đã duyệt" : "Chưa duyệt"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Mở phiếu #${row.id}`}
                      onClick={() => setSelected(row)}
                    >
                      Mở phiếu
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {data && !error && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
          <span>{data.total.toLocaleString("vi-VN")} phiếu</span>
          {(page > 1 || totalPages > 1) && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Trang trước"
                disabled={page === 1}
                onClick={() => setPage(Math.min(page - 1, totalPages))}
              >
                <ChevronLeft />
              </Button>
              <span>
                Trang {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Trang sau"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </footer>
      )}
    </section>
  );
}
