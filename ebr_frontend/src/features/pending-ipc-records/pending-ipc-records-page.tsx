"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft } from "lucide-react";
import useSWR from "swr";
import HeaderListSemiFinishedLot from "@/components/header-list-semi-finished-lot/header-list-semi-finished-lot";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import type { ListFilters } from "@/components/list-filter-button";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import ProductionOrderMixingRecordDetail from "@/features/production-order-mixing-records/components/production-order-mixing-record-detail";
import ProductionOrderWeighingRecordDetail from "@/features/production-order-weighing-records/components/production-order-weighing-record-detail";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import { PRODUCTION_ORDER_DATA_CHANGED } from "@/lib/production-order-data-events";
import weighingService from "@/services/production-order-weighing-records.service";
import useSearchStore from "@/store/search.store";
import type { PendingIpcRecord } from "./types";

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
const dateGroup = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default function PendingIpcRecordsPage({
  kind,
}: {
  kind: keyof typeof queues;
}) {
  const { title, path, endpoint } = queues[kind];
  const isMobile = useMobile();
  const isTablet = useTablet();
  const [selected, setSelected] = useState<PendingIpcRecord>();
  const [filters, setFilters] = useState<ListFilters>({});
  const search = useSearchStore(
    (state) => state.searchByPath[path] ?? "",
  ).trim();
  const {
    records,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
  } = useInfiniteRecordList<PendingIpcRecord>({
    url: endpoint,
    filters: { ...filters, search: search || undefined },
    storageKey: `pending-${kind}-records-scroll`,
    async fetchPage(page, limit) {
      const { data } = await axiosClient.get<{
        data: PendingIpcRecord[];
        total: number;
      }>(endpoint, {
        params: { ...filters, page, limit, search: search || undefined },
      });
      return { ...data, page, limit };
    },
  });

  useEffect(() => {
    function refresh(event: Event) {
      const { url } = (event as CustomEvent<{ url: string }>).detail;
      if (
        url.startsWith(`/production-orders/${kind}-records/`) ||
        url.endsWith("/sampling-requests")
      ) {
        retry();
      }
    }
    window.addEventListener(PRODUCTION_ORDER_DATA_CHANGED, refresh);
    return () =>
      window.removeEventListener(PRODUCTION_ORDER_DATA_CHANGED, refresh);
  }, [kind, retry]);

  const groups = useMemo(() => {
    const byDate = new Map<string, PendingIpcRecord[]>();
    for (const record of records) {
      const day = record.created_at
        ? dateGroup.format(new Date(record.created_at))
        : "Không rõ ngày tạo";
      const group = byDate.get(day);
      if (group) group.push(record);
      else byDate.set(day, [record]);
    }
    return [...byDate];
  }, [records]);

  const forbidden = isAxiosError(error) && error.response?.status === 403;
  const showMobileDetail = isMobile && Boolean(selected);
  function closeDetail() {
    setSelected(undefined);
    retry();
  }
  const detail = selected && (
    <section
      key={selected.id}
      className="h-full overflow-auto p-2 md:p-4"
      aria-label="Chi tiết phiếu được chọn"
    >
      <div className="flex flex-col items-center rounded">
        {kind === "mixing" ? (
          <ProductionOrderMixingRecordDetail
            recordId={selected.id}
            productionOrder={selected.productionOrder}
            onClose={closeDetail}
          />
        ) : (
          <WeighingDetail row={selected} onClose={closeDetail} />
        )}
      </div>
    </section>
  );

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <div className={showMobileDetail ? "hidden" : "h-full"}>
        <ResizablePanelGroup>
          <ResizablePanel
            id={`pending-${kind}-list`}
            defaultSize={isTablet ? "25%" : "30%"}
            minSize={isTablet ? "20%" : "25%"}
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div
              ref={containerRef}
              className="flex h-full min-h-0 flex-col overflow-auto"
            >
              <HeaderListSemiFinishedLot
                title={title}
                href={path}
                filters={filters}
                onApply={setFilters}
                onTitleClick={() => setSelected(undefined)}
                disabled={forbidden}
              />
              <div className="flex flex-col gap-2 p-2 pt-0">
                {forbidden ? (
                  <p
                    role="alert"
                    className="p-4 text-center text-sm text-red-600"
                  >
                    Bạn chưa có quyền xem danh sách phiếu.
                  </p>
                ) : isLoading ? (
                  Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={index}
                      aria-hidden="true"
                      className="min-h-[100px] border-b border-gray-200 px-3 py-4"
                    >
                      <Skeleton className="mb-2 h-4 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))
                ) : groups.length ? (
                  groups.map(([day, rows]) => (
                    <section key={day}>
                      <h2 className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                        {day}
                      </h2>
                      {rows.map((row) => (
                        <PendingRecordRow
                          key={row.id}
                          row={row}
                          active={selected?.id === row.id}
                          onClick={() => setSelected(row)}
                        />
                      ))}
                    </section>
                  ))
                ) : !error && !hasMore ? (
                  <p
                    role="status"
                    className="p-4 text-center text-sm text-gray-500"
                  >
                    Không có phiếu chờ IPC phù hợp.
                  </p>
                ) : null}
                {!forbidden && (
                  <InfiniteRecordLoadStatus
                    sentinelRef={sentinelRef}
                    count={records.length}
                    error={error}
                    loading={isLoadingMore}
                    hasMore={hasMore}
                    onRetry={retry}
                    onLoadMore={loadMore}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>
          {selected && !isMobile && (
            <>
              <ResizableHandle aria-label="Điều chỉnh chiều rộng danh sách và chi tiết" />
              <ResizablePanel
                id={`pending-${kind}-detail`}
                defaultSize={isTablet ? "75%" : "70%"}
                minSize="40%"
                className="min-h-0 min-w-0 overflow-hidden"
              >
                {detail}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      {showMobileDetail && detail}
    </div>
  );
}

function PendingRecordRow({
  row,
  active,
  onClick,
}: {
  row: PendingIpcRecord;
  active: boolean;
  onClick: () => void;
}) {
  const order = row.productionOrder;
  const product = order.item.item_name || order.item_code;
  const lotAndRecord = [order.lot_no, row.description]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      aria-current={active || undefined}
      onClick={onClick}
      className={`flex min-h-[100px] w-full cursor-pointer items-center gap-4 border-b border-gray-200 px-3 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 ${
        active ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-bold text-gray-900"
          title={product}
        >
          {product}
        </span>
        <span
          className="mt-1 block truncate text-sm text-gray-600"
          title={lotAndRecord}
        >
          {lotAndRecord || "—"}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm text-gray-600">
        #{row.id}
      </span>
    </button>
  );
}

function WeighingDetail({
  row,
  onClose,
}: {
  row: PendingIpcRecord;
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
    <div className="w-full max-w-4xl space-y-3 rounded-lg border bg-white p-4 text-sm">
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
