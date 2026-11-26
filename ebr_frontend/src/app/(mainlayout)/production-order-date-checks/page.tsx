"use client";
import {
  ListFilterButton,
  type ListFilters,
} from "@/components/list-filter-button";
import { dateCheckFilters } from "@/lib/basic-list-filters";
import { useState as useFilterState } from "react";

import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AiOutlineRight } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { useTableSkeletonRowCount } from "@/hooks/use-table-skeleton-row-count";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DateCheckDetail,
  type ProductionOrderDateCheck,
} from "@/features/production-order-date-checks";
import {
  formatApprovalStatus,
  formatDateTime,
  formatPackageType,
  getUserLabel,
} from "@/features/production-order-date-checks/utils";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";

const LIST_PATH = "/production-order-date-checks";
const COLUMN_COUNT = 10;

const getProductLabel = (check: ProductionOrderDateCheck) =>
  check.productionOrder?.item?.item_name ??
  check.productionOrder?.description ??
  check.productionOrder?.item_code ??
  "";

const getStatusClassName = (status: string | null | undefined) => {
  if (status === "approved") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const groupChecksByLastImageUploadDate = (
  checks: ProductionOrderDateCheck[],
) => {
  const groups = new Map<string, ProductionOrderDateCheck[]>();
  checks.forEach((check) => {
    const value = check.last_image_uploaded_at;
    const date = value ? new Date(value) : null;
    const label =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("vi-VN")
        : "Không rõ ngày tải ảnh";
    const group = groups.get(label);
    if (group) {
      group.push(check);
    } else {
      groups.set(label, [check]);
    }
  });
  return Array.from(groups, ([label, checks]) => ({ label, checks }));
};

function DateChecksTableSkeleton() {
  const rowCount = useTableSkeletonRowCount();
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <TableRow key={rowIndex}>
      {Array.from({ length: COLUMN_COUNT }, (_, cellIndex) => (
        <TableCell key={cellIndex} className="border-r">
          <Skeleton className="h-4 w-full min-w-16" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function ProductionOrderDateChecksPage() {
  const [filters, setFilters] = useFilterState<ListFilters>({});
  const pathname = usePathname();
  const isMobile = useMobile();
  const [selectedCheckId, setSelectedCheckId] = useState<
    string | number | null
  >(null);
  const [detailHeaderActionsElement, setDetailHeaderActionsElement] =
    useState<HTMLDivElement | null>(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  ).trim();
  const {
    records: checks,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
  } = useInfiniteRecordList<ProductionOrderDateCheck & { id: string | number }>(
    {
      url: API_ROUTES.productionOrders.allDateChecks,
      filters: {
        ...filters,
        search: searchKeyword || undefined,
        has_images: true,
        order_by: "last_image_uploaded_at",
      },
      storageKey: "dateCheckListScroll",
    },
  );
  const filteredChecks = checks;
  const groupedChecks = useMemo(
    () => groupChecksByLastImageUploadDate(filteredChecks),
    [filteredChecks],
  );
  const selectedCheck = checks.find(
    (check) =>
      selectedCheckId !== null && String(check.id) === String(selectedCheckId),
  );
  const selectedCheckTitle = selectedCheck
    ? [getProductLabel(selectedCheck), selectedCheck.productionOrder?.lot_no]
        .filter(Boolean)
        .join(" - ") || `#${selectedCheckId}`
    : `#${selectedCheckId}`;

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full pr-12 bg-white p-2">
        <div className="absolute right-2 top-2">
          <ListFilterButton
            groups={dateCheckFilters}
            filters={filters}
            onApply={setFilters}
            disabled={false}
            title="Lọc dữ liệu"
          />
        </div>
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href={LIST_PATH}>Phiếu theo dõi In Date</Link>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        <table className="w-full min-w-[1200px] caption-bottom border-t text-[13px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-32 border-r px-3 font-bold text-gray-900">
                Mã sản phẩm
              </TableHead>
              <TableHead className="w-72 border-r px-3 font-bold text-gray-900">
                Tên sản phẩm
              </TableHead>
              <TableHead className="w-32 border-r px-3 font-bold text-gray-900">
                Số lô
              </TableHead>
              <TableHead className="w-32 border-r px-3 font-bold text-gray-900">
                Loại bao bì
              </TableHead>
              <TableHead className="w-44 border-r px-3 font-bold text-gray-900">
                Thời điểm kiểm tra
              </TableHead>
              <TableHead className="w-40 border-r px-3 font-bold text-gray-900">
                Người tải ảnh gần nhất
              </TableHead>
              <TableHead className="w-32 border-r px-3 font-bold text-gray-900">
                Trạng thái
              </TableHead>
              <TableHead className="w-28 border-r px-3 font-bold text-gray-900">
                File yêu cầu
              </TableHead>
              <TableHead className="w-40 border-r px-3 font-bold text-gray-900">
                Người nhập
              </TableHead>
              <TableHead className="w-40 px-3 font-bold text-gray-900">
                Người duyệt
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <DateChecksTableSkeleton />
            ) : groupedChecks.length > 0 ? (
              groupedChecks.map((group) => (
                <Fragment key={group.label}>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="border-r px-3 font-semibold text-gray-900"
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.checks.map((check, index) => {
                    const checkId = check.id;
                    const isSelectable =
                      checkId !== null && checkId !== undefined;
                    const isSelected =
                      selectedCheckId !== null &&
                      isSelectable &&
                      String(selectedCheckId) === String(checkId);
                    return (
                      <TableRow
                        key={checkId ?? `${group.label}-${index}`}
                        tabIndex={isSelectable ? 0 : undefined}
                        aria-selected={isSelected}
                        data-state={isSelected ? "selected" : undefined}
                        className={`${isSelectable ? "cursor-pointer" : ""} ${
                          isSelected
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          if (isSelectable) {
                            saveScrollPosition();
                            setSelectedCheckId(checkId);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (
                            isSelectable &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            saveScrollPosition();
                            setSelectedCheckId(checkId);
                          }
                        }}
                      >
                        <TableCell className="border-r px-3">
                          {check.productionOrder?.item_code ?? ""}
                        </TableCell>
                        <TableCell className="max-w-72 whitespace-normal break-words border-r px-3">
                          {getProductLabel(check)}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {check.productionOrder?.lot_no}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {formatPackageType(check.package_type)}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {formatDateTime(check.checked_at)}
                        </TableCell>
                        <TableCell className="max-w-40 whitespace-normal break-words border-r px-3">
                          {getUserLabel(check.last_image_uploaded_by) || "—"}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <Badge
                            variant="outline"
                            className={getStatusClassName(
                              check.approval_status,
                            )}
                          >
                            {formatApprovalStatus(check.approval_status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {check.request_file_path ? "Có" : "Không có"}
                        </TableCell>
                        <TableCell className="max-w-40 whitespace-normal break-words border-r px-3">
                          {getUserLabel(check.createdBy)}
                        </TableCell>
                        <TableCell className="max-w-40 whitespace-normal break-words px-3">
                          {getUserLabel(check.approvedBy)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))
            ) : !error ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMN_COUNT}
                  className="h-32 text-center text-sm text-gray-500"
                >
                  {searchKeyword.trim() || Object.keys(filters).length > 0
                    ? "Không tìm thấy phiếu theo dõi In Date phù hợp."
                    : "Chưa có phiếu theo dõi In Date đã tải ảnh."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </table>
        <InfiniteRecordLoadStatus
          sentinelRef={sentinelRef}
          count={checks.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );

  const detailPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between gap-2 border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="shrink-0"
              onClick={() => setSelectedCheckId(null)}
            >
              Phiếu In Date
            </button>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{selectedCheckTitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              ref={setDetailHeaderActionsElement}
              className="flex items-center gap-2"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setSelectedCheckId(null)}
              aria-label="Đóng chi tiết"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 md:p-4">
        {selectedCheckId !== null ? (
          <DateCheckDetail
            key={selectedCheckId}
            id={selectedCheckId}
            onClose={() => setSelectedCheckId(null)}
            showCloseButton={false}
            externalActionsContainer={detailHeaderActionsElement}
          />
        ) : null}
      </div>
    </div>
  );

  const shouldShowMobileDetail = isMobile && selectedCheckId !== null;
  return (
    <>
      {shouldShowMobileDetail ? (
        <div className="h-full overflow-hidden">{detailPanel}</div>
      ) : null}
      <div
        className={`h-full overflow-hidden rounded-lg bg-white shadow-md${shouldShowMobileDetail ? " hidden" : ""}`}
      >
        <ResizablePanelGroup>
          <ResizablePanel
            defaultSize={selectedCheckId !== null ? "55%" : "100%"}
            minSize="35%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            {listPanel}
          </ResizablePanel>
          {selectedCheckId !== null && !isMobile ? (
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
          ) : null}
        </ResizablePanelGroup>
      </div>
    </>
  );
}
