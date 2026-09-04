"use client";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinishedProductSummaryDetail } from "@/features/finished-product-summary";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { productOrdersService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";

type FinishedProductSummaryUser = {
  id?: string | number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type FinishedProductSummaryOrder = {
  id?: string | number | null;
  item_code?: string | null;
  production_order_code?: string | null;
  status?: string | null;
  type?: string | null;
  planned_quatity?: string | number | null;
  planned_quantity?: string | number | null;
  unit?: string | null;
  lot_no?: string | null;
  date_manufacture?: string | null;
  expire_date?: string | null;
  pyclm?: {
    isSent?: boolean | null;
    status?: string | null;
    googleDocUrl?: string | null;
    sentAt?: string | null;
    location?: string | null;
    sender?: FinishedProductSummaryUser | null;
  } | null;
  item?: {
    item_code?: string | null;
    item_name?: string | null;
    unit?: string | null;
  } | null;
};

type FinishedProductSummary = {
  id: string | number;
  production_order_id?: string | number | null;
  package_count?: string | number | null;
  boxes_per_package?: string | number | null;
  loose_box_count?: string | number | null;
  total_quantity?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  productionOrder?: FinishedProductSummaryOrder | null;
  production_order?: FinishedProductSummaryOrder | null;
  createdBy?: FinishedProductSummaryUser | null;
  created_by?: FinishedProductSummaryUser | null;
};

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString("vi-VN");
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("vi-VN");
};

const toNumber = (value: string | number | null | undefined) => {
  const numberValue = Number(value ?? 0);
  return Number.isNaN(numberValue) ? 0 : numberValue;
};

const getTotalQuantity = (summary: FinishedProductSummary) =>
  summary.total_quantity ??
  toNumber(summary.package_count) * toNumber(summary.boxes_per_package) +
    toNumber(summary.loose_box_count);

const getProductionOrder = (summary: FinishedProductSummary) =>
  summary.productionOrder ?? summary.production_order ?? null;

const getCreatedBy = (summary: FinishedProductSummary) =>
  summary.createdBy ?? summary.created_by ?? null;

const getUserLabel = (user: FinishedProductSummaryUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

const isPyclmSent = (
  pyclm: FinishedProductSummaryOrder["pyclm"],
) => {
  if (pyclm?.isSent !== null && pyclm?.isSent !== undefined) {
    return pyclm.isSent;
  }

  const status = pyclm?.status?.trim().toLowerCase();

  return ["sent", "done", "completed"].includes(status ?? "");
};

function PyclmStatus({ sent }: { sent: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`size-3 shrink-0 rounded-full ${
          sent ? "bg-green-600" : "bg-red-600"
        }`}
      />
      <span>{sent ? "Đã gửi" : "Chưa gửi"}</span>
    </span>
  );
}

function FinishedProductSummariesSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: 12 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="border-r">
              <Skeleton className="h-4 w-full min-w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

const getDateGroupKey = (value: string | null | undefined) => {
  if (!value) return "unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const groupSummariesByCreatedDate = (summaries: FinishedProductSummary[]) => {
  const groups: {
    key: string;
    label: string;
    summaries: FinishedProductSummary[];
  }[] = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  summaries.forEach((summary) => {
    const key = getDateGroupKey(summary.created_at);
    const existingGroup = groupMap.get(key);

    if (existingGroup) {
      existingGroup.summaries.push(summary);
      return;
    }

    const group = {
      key,
      label: summary.created_at
        ? formatDate(summary.created_at)
        : "Không rõ ngày tạo",
      summaries: [summary],
    };

    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

function EmptyDetailState() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500">
      Chọn một tổng kết thành phẩm trong bảng để xem chi tiết.
    </div>
  );
}

export default function FinishedProductSummariesPage() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [selectedSummaryId, setSelectedSummaryId] = useState<
    string | number | null
  >(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const { data, error, isLoading } = useSWR<FinishedProductSummary[]>(
    API_ROUTES.productionOrders.finishedProductSummaries,
    productOrdersService.fetchFinishedProductSummaries,
  );

  const summaries = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const filteredSummaries = useMemo(() => {
    if (!searchKeyword) return summaries;

    return summaries.filter((summary) => {
      const productionOrder = getProductionOrder(summary);
      const createdBy = getCreatedBy(summary);

      return matchesSearchKeyword(
        [
          summary.id,
          summary.production_order_id,
          productionOrder?.production_order_code,
          productionOrder?.item_code,
          productionOrder?.item?.item_code,
          productionOrder?.item?.item_name,
          productionOrder?.lot_no,
          productionOrder?.pyclm?.status,
          isPyclmSent(productionOrder?.pyclm) ? "Đã gửi" : "Chưa gửi",
          productionOrder?.pyclm?.location,
          getUserLabel(productionOrder?.pyclm?.sender),
          getUserLabel(createdBy),
          createdBy?.department,
          summary.created_at,
        ],
        searchKeyword,
      );
    });
  }, [searchKeyword, summaries]);
  const groupedSummaries = useMemo(
    () => groupSummariesByCreatedDate(filteredSummaries),
    [filteredSummaries],
  );
  const selectedSummary = useMemo(
    () =>
      summaries.find(
        (summary) =>
          selectedSummaryId !== null &&
          String(summary.id) === String(selectedSummaryId),
      ),
    [selectedSummaryId, summaries],
  );
  const selectedProductionOrder = selectedSummary
    ? getProductionOrder(selectedSummary)
    : null;
  const selectedSummaryTitle = selectedSummary
    ? [
        selectedProductionOrder?.item?.item_name,
        selectedProductionOrder?.lot_no,
      ]
        .filter(Boolean)
        .join(" - ") || `#${selectedSummary.id}`
    : selectedSummaryId
      ? `#${selectedSummaryId}`
      : "";
  const selectedSummaryExists = filteredSummaries.some(
    (summary) =>
      selectedSummaryId !== null &&
      String(summary.id) === String(selectedSummaryId),
  );
  const shouldShowMobileDetail = isMobile && selectedSummaryId !== null;

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
            <AiOutlineRight className="shrink-0" />
            <Link href="/finished-product-summaries">
              Danh sách tổng kết thành phẩm
            </Link>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
            {filteredSummaries.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        {error ? (
          <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách tổng kết thành phẩm.
          </div>
        ) : (
          <table className="w-full min-w-[1400px] caption-bottom border-t text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 border-r px-2 font-bold text-gray-900">
                  Mã sản phẩm
                </TableHead>
                <TableHead className="w-72 border-r px-3 font-bold text-gray-900">
                  Tên sản phẩm
                </TableHead>
                <TableHead className="border-r px-3 font-bold text-gray-900">
                  Số lô
                </TableHead>
                <TableHead className="border-r px-3 text-right font-bold text-gray-900">
                  Cỡ lô
                </TableHead>
                <TableHead className="border-r px-3 text-center font-bold text-gray-900">
                  NSX
                </TableHead>
                <TableHead className="border-r px-3 text-center font-bold text-gray-900">
                  HSD
                </TableHead>
                <TableHead className="w-20 whitespace-normal border-r px-2 text-right font-bold text-gray-900">
                  Số kiện
                </TableHead>
                <TableHead className="w-24 whitespace-normal border-r px-2 text-right font-bold text-gray-900">
                  Số hộp/kiện
                </TableHead>
                <TableHead className="w-20 whitespace-normal border-r px-2 text-right font-bold text-gray-900">
                  Số hộp lẻ
                </TableHead>
                <TableHead className="w-24 whitespace-normal border-r px-2 text-right font-bold text-gray-900">
                  Tổng số lượng
                </TableHead>
                <TableHead className="border-r px-3 font-bold text-gray-900">
                  Gửi PYCLM
                </TableHead>
                <TableHead className="border-r px-3 font-bold text-gray-900">
                  Người tạo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <FinishedProductSummariesSkeleton />
              ) : groupedSummaries.length > 0 ? (
                groupedSummaries.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell
                        colSpan={12}
                        className="border-r px-3 font-semibold text-gray-900"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.summaries.map((summary) => {
                      const productionOrder = getProductionOrder(summary);
                      const createdBy = getCreatedBy(summary);
                      const isSelected =
                        selectedSummaryId !== null &&
                        String(summary.id) === String(selectedSummaryId);

                      return (
                        <TableRow
                          key={summary.id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          data-state={isSelected ? "selected" : undefined}
                          className={`cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedSummaryId(summary.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedSummaryId(summary.id);
                            }
                          }}
                        >
                      <TableCell className="border-r px-2">
                        {productionOrder?.item_code ??
                          productionOrder?.item?.item_code}
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-normal break-words border-r px-3">
                        {productionOrder?.item?.item_name}
                      </TableCell>
                      <TableCell className="border-r px-3">
                        {productionOrder?.lot_no}
                      </TableCell>
                      <TableCell className="border-r px-3 text-right">
                        {[
                          formatNumber(
                            productionOrder?.planned_quatity ??
                              productionOrder?.planned_quantity,
                          ),
                          productionOrder?.unit ?? productionOrder?.item?.unit,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </TableCell>
                      <TableCell className="border-r px-3 text-center">
                        {formatDate(productionOrder?.date_manufacture)}
                      </TableCell>
                      <TableCell className="border-r px-3 text-center">
                        {formatDate(productionOrder?.expire_date)}
                      </TableCell>
                      <TableCell className="border-r px-2 text-right">
                        {formatNumber(summary.package_count)}
                      </TableCell>
                      <TableCell className="border-r px-2 text-right">
                        {formatNumber(summary.boxes_per_package)}
                      </TableCell>
                      <TableCell className="border-r px-2 text-right">
                        {formatNumber(summary.loose_box_count)}
                      </TableCell>
                      <TableCell className="border-r px-2 text-right font-semibold">
                        {formatNumber(getTotalQuantity(summary))}
                      </TableCell>
                      <TableCell className="border-r px-3">
                        <PyclmStatus
                          sent={isPyclmSent(productionOrder?.pyclm)}
                        />
                      </TableCell>
                      <TableCell className="border-r px-3">
                        {getUserLabel(createdBy)}
                      </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    {isSearching
                      ? "Không tìm thấy tổng kết thành phẩm phù hợp."
                      : "Chưa có tổng kết thành phẩm nào."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        )}
      </div>
    </div>
  );

  const detailPanel = selectedSummaryId ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="shrink-0"
              href="/finished-product-summaries"
              onClick={() => setSelectedSummaryId(null)}
            >
              Tổng kết thành phẩm
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{selectedSummaryTitle}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => setSelectedSummaryId(null)}
            aria-label="Thoát detail"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-2 md:p-4">
        <FinishedProductSummaryDetail
          id={selectedSummaryId}
          onClose={() => setSelectedSummaryId(null)}
          showCloseButton={false}
        />
      </div>
    </div>
  ) : (
    <EmptyDetailState />
  );

  if (shouldShowMobileDetail) {
    return <div className="h-full overflow-auto">{detailPanel}</div>;
  }

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        <ResizablePanel
          defaultSize={selectedSummaryExists ? 55 : 100}
          minSize={35}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {listPanel}
        </ResizablePanel>

        {selectedSummaryId ? (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={45}
              minSize={30}
              className="min-h-0 min-w-0 overflow-auto bg-blue-50"
            >
              {detailPanel}
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
