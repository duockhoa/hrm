"use client";
import {
  ReceiptFilterButton,
  type ReceiptFilters,
} from "../warehouse-receipt-items/receipt-filters";
import { checkFilterGroups } from "../warehouse-receipt-items/list-filter-groups";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSkeletonRowCount } from "@/hooks/use-skeleton-row-count";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import { Plus, X } from "lucide-react";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import useMobile from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";
import {
  WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL,
  type WarehouseTemperatureHumidityCheck,
} from "@/services/warehouse-temperature-humidity-checks.service";
import CheckDetail, {
  formatCheckResult,
  formatCheckDateTime,
} from "./check-detail";
import CheckForm, { checkError } from "./check-form";

const columns = [
  "Ca",
  "Vị trí",
  "Nhiệt độ (°C)",
  "Độ ẩm (%RH)",
  "Kết quả",
  "Thời điểm kiểm tra",
  "Người kiểm tra",
];

const warehouseTimeZone = "Asia/Ho_Chi_Minh";
const checkHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: warehouseTimeZone,
  hour: "2-digit",
  hourCycle: "h23",
});

function formatCheckShift(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return Number(checkHourFormatter.format(date)) < 12 ? "Sáng" : "Chiều";
}

function rowValues(check: WarehouseTemperatureHumidityCheck) {
  return [
    formatCheckShift(check.created_at),
    check.location,
    check.temperature,
    check.humidity,
    formatCheckResult(check.is_passed),
    formatCheckDateTime(check.created_at),
    check.checkedBy?.name || check.checkedBy?.username,
  ];
}

export default function CheckPage({
  initialId = null,
}: {
  initialId?: number | null;
}) {
  const isMobile = useMobile();
  const skeletonRows = useSkeletonRowCount();
  const router = useRouter();
  const pathname = usePathname();
  const scope = getSearchScopePath(pathname);
  const search = useSearchStore((state) => state.searchByPath[scope] ?? "");
  const [selectedId, setSelectedId] = useState(initialId);
  const [actionsContainer, setActionsContainer] =
    useState<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<ReceiptFilters>({});
  const serverSearch = useDebouncedValue(search.trim());
  const {
    records: data,
    error,
    isLoading,
    mutate,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
  } = useInfiniteRecordList<WarehouseTemperatureHumidityCheck>({
    url: WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL,
    filters: { ...filters, search: serverSearch || undefined },
    observe: !isMobile || selectedId === null,
    storageKey: "warehouseCheckListScroll",
  });
  const groups = useMemo(() => {
    const result = new Map<string, WarehouseTemperatureHumidityCheck[]>();
    for (const check of data ?? []) {
      const date = new Date(check.created_at).toLocaleDateString("vi-VN", {
        timeZone: warehouseTimeZone,
      });
      const group = result.get(date) ?? [];
      group.push(check);
      result.set(date, group);
    }
    return Array.from(result, ([date, checks]) => ({ date, checks }));
  }, [data]);
  const selected = data?.find((check) => check.id === selectedId);
  const title = selected ? selected.location : `#${selectedId}`;
  function closeDetail() {
    setSelectedId(null);
    if (initialId !== null)
      router.replace("/warehouse-temperature-humidity-checks");
  }

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/warehouse-temperature-humidity-checks">
              Kiểm tra nhiệt độ, độ ẩm kho
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Thêm
            </Button>
            <ReceiptFilterButton
              title="Lọc nhiệt độ, độ ẩm kho"
              groups={checkFilterGroups}
              filters={filters}
              onApply={(next) => {
                setFilters(next);
                closeDetail();
              }}
              disabled={false}
            />
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        {error && data.length === 0 ? (
          <div
            role="alert"
            className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {checkError(
              error,
              "Không thể tải danh sách kiểm tra nhiệt độ, độ ẩm kho.",
            )}
          </div>
        ) : (
          <table className="w-full min-w-[900px] caption-bottom border-t text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="hover:bg-transparent">
                {columns.map((label) => (
                  <TableHead
                    key={label}
                    className="border-r px-3 font-bold text-gray-900 last:border-r-0"
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: skeletonRows }, (_, row) => (
                  <TableRow key={row}>
                    {columns.map((label) => (
                      <TableCell key={label} className="border-r">
                        <Skeleton className="h-4 w-full min-w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : groups.length ? (
                groups.map((group) => (
                  <Fragment key={group.date}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell
                        colSpan={columns.length}
                        className="border-r px-3 font-semibold text-gray-900"
                      >
                        <span className="inline-flex items-center gap-2">
                          {group.date}
                          <span
                            className="rounded bg-gray-200 px-1 text-xs font-normal text-gray-700 tabular-nums"
                            aria-label={`${group.checks.length} bản ghi kiểm tra nhiệt độ, độ ẩm ngày ${group.date}`}
                            title="Số bản ghi kiểm tra nhiệt độ, độ ẩm đang hiển thị trong ngày"
                          >
                            {group.checks.length}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                    {group.checks.map((check) => (
                      <TableRow
                        key={check.id}
                        tabIndex={0}
                        aria-selected={selectedId === check.id}
                        data-state={
                          selectedId === check.id ? "selected" : undefined
                        }
                        className={`cursor-pointer ${selectedId === check.id ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}
                        onClick={() => setSelectedId(check.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(check.id);
                          }
                        }}
                      >
                        {rowValues(check).map((value, index) => (
                          <TableCell
                            key={columns[index]}
                            className="max-w-72 whitespace-pre-wrap break-words border-r px-3 last:border-r-0"
                          >
                            {columns[index] === "Kết quả" ? (
                              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <span
                                  aria-hidden="true"
                                  className={`size-3.5 shrink-0 rounded-full ${
                                    check.is_passed === true
                                      ? "bg-green-600"
                                      : check.is_passed === false
                                        ? "bg-red-600"
                                        : "bg-gray-400"
                                  }`}
                                />
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    {search.trim() || Object.keys(filters).length > 0
                      ? "Không tìm thấy kiểm tra nhiệt độ, độ ẩm kho phù hợp."
                      : "Chưa có kiểm tra nhiệt độ, độ ẩm kho."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        )}
        <InfiniteRecordLoadStatus
          sentinelRef={sentinelRef}
          count={data.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
  const detailPanel = selectedId !== null && (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full flex-wrap justify-between gap-2 border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="shrink-0"
              href="/warehouse-temperature-humidity-checks"
              onClick={(event) => {
                event.preventDefault();
                closeDetail();
              }}
            >
              Kiểm tra nhiệt độ, độ ẩm kho
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              ref={setActionsContainer}
              className="flex items-center gap-2"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={closeDetail}
              aria-label="Đóng chi tiết"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 md:p-4">
        <CheckDetail
          key={selectedId}
          id={selectedId}
          onClose={closeDetail}
          externalActionsContainer={actionsContainer}
        />
      </div>
    </div>
  );
  return (
    <>
      {isMobile && selectedId !== null ? (
        <div className="h-full overflow-auto">{detailPanel}</div>
      ) : (
        <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
          <ResizablePanelGroup>
            <ResizablePanel
              defaultSize={selectedId !== null ? "55%" : "100%"}
              minSize="35%"
              className="min-h-0 min-w-0 overflow-hidden"
            >
              {listPanel}
            </ResizablePanel>
            {selectedId !== null && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize="45%"
                  minSize="30%"
                  className="min-h-0 min-w-0 overflow-hidden bg-blue-50"
                >
                  {detailPanel}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              Thêm kiểm tra nhiệt độ, độ ẩm kho
            </DialogTitle>
          </DialogHeader>
          <CheckForm
            onCancel={() => setCreating(false)}
            onSaved={(saved) => {
              setCreating(false);
              setSelectedId(saved.id);
              void mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
