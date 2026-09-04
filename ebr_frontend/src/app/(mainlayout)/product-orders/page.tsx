"use client";

import { ListProductOrderHeader } from "@/features/production-orders";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { isCancelledProductionOrder } from "@/lib/production-order-status";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { productOrdersService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useMemo, useRef } from "react";
import useSWR from "swr";

const PRODUCT_ORDERS_ROUTE = "/product-orders";
const LOT_TABS = {
  semiFinished: "semi-finished",
  finished: "finished",
} as const;

type LotTab = (typeof LOT_TABS)[keyof typeof LOT_TABS];

type ProductionOrderLot = {
  id: string | number;
  status?: string | number | null;
  item_code?: string | null;
  description?: string | null;
  production_order_code?: string | null;
  lot_no?: string | null;
  planned_quatity?: string | number | null;
  planned_quantity?: string | number | null;
  unit?: string | null;
  date_manufacture?: string | null;
  expire_date?: string | null;
  creation_date?: string | null;
  created_at?: string | null;
  item?: { item_name?: string | null } | null;
  pyclm?: { isSent?: boolean | null } | null;
  documentControl?: Record<string, unknown> | null;
  document_control?: Record<string, unknown> | null;
  [key: string]: unknown;
};

const formatNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN");
};

const formatCompactDate = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}${month}${year}`;
};

const getLotCreationDate = (lot: any) => lot?.creation_date ?? lot?.created_at;

const formatDateGroup = (value: string | null | undefined) => {
  if (!value) {
    return "Không rõ ngày tạo";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN");
};

const getDateGroupKey = (value: string | null | undefined) => {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const groupLotsByCreationDate = <T extends Record<string, any>>(lots: T[]) => {
  const groups: { key: string; label: string; lots: T[] }[] = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  lots.forEach((lot) => {
    const creationDate = getLotCreationDate(lot);
    const key = getDateGroupKey(creationDate);
    const existingGroup = groupMap.get(key);

    if (existingGroup) {
      existingGroup.lots.push(lot);
      return;
    }

    const group = {
      key,
      label: formatDateGroup(creationDate),
      lots: [lot],
    };

    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

const formatProductionOrderStatus = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const statusLabels: Record<string, string> = {
    boposPlanned: "Đã lên kế hoạch",
    boppPlanned: "Đã lên kế hoạch",
    Planned: "Đã lên kế hoạch",
    P: "Đã lên kế hoạch",
    boposReleased: "Đã phát hành",
    boppReleased: "Đã phát hành",
    Released: "Đã phát hành",
    R: "Đã phát hành",
    boposClosed: "Đã đóng",
    boppClosed: "Đã đóng",
    Closed: "Đã đóng",
    L: "Đã đóng",
    boposCancelled: "Đã huỷ",
    boppCancelled: "Đã huỷ",
    Cancelled: "Đã huỷ",
    C: "Đã huỷ",
  };

  const key = String(value);

  return statusLabels[key] ?? key;
};

const getFirstValue = (source: any, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
};

const getBooleanValue = (source: any, keys: string[]) => {
  const value = getFirstValue(source, keys);

  if (value === null) {
    return false;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  return ["1", "true", "yes", "sent", "done", "received", "passed"].includes(
    normalizedValue,
  );
};

const getDocumentControlValue = (lot: any, keys: string[]) =>
  getFirstValue(lot?.documentControl, keys) ??
  getFirstValue(lot?.document_control, keys) ??
  getFirstValue(lot, keys);

function StatusCell({
  checked,
  checkedLabel,
  uncheckedLabel,
}: {
  checked: boolean;
  checkedLabel: string;
  uncheckedLabel: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`size-3 shrink-0 rounded-full ${
          checked ? "bg-green-600" : "bg-red-600"
        }`}
      />
      <span>{checked ? checkedLabel : uncheckedLabel}</span>
    </span>
  );
}

function ProductionStatusCell({ status }: { status: string }) {
  if (!status) {
    return null;
  }

  const colorClass = status.includes("huỷ")
    ? "bg-red-50 text-red-700 ring-red-200"
    : status.includes("phát hành")
      ? "bg-green-50 text-green-700 ring-green-200"
      : status.includes("đóng")
        ? "bg-gray-100 text-gray-700 ring-gray-200"
        : "bg-blue-50 text-blue-700 ring-blue-200";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${colorClass}`}
    >
      {status}
    </span>
  );
}

function ProductOrderTableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          {Array.from({ length: 13 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="border-r">
              <Skeleton className="h-4 w-full min-w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function ProductOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLotId = pathname.startsWith(`${PRODUCT_ORDERS_ROUTE}/`)
    ? decodeURIComponent(pathname.replace(`${PRODUCT_ORDERS_ROUTE}/`, ""))
    : null;
  const {
    data: semiFinishedProducts = [],
    isLoading: semiFinishedProductsLoading,
  } = useSWR<ProductionOrderLot[]>(
    API_ROUTES.productionOrders.semiFinishedProducts,
    productOrdersService.fetchSemiFinishedProducts,
  );
  const { data: finishedProducts = [], isLoading: finishedProductsLoading } =
    useSWR<ProductionOrderLot[]>(
      API_ROUTES.productionOrders.finishedProducts,
      productOrdersService.fetchFinishedProducts,
    );
  const requestedTab = searchParams.get("tab");
  const inferredTab =
    activeLotId &&
    finishedProducts.some((lot) => String(lot.id) === activeLotId) &&
    !semiFinishedProducts.some((lot) => String(lot.id) === activeLotId)
      ? LOT_TABS.finished
      : LOT_TABS.semiFinished;
  const activeTab: LotTab =
    requestedTab === LOT_TABS.finished || requestedTab === LOT_TABS.semiFinished
      ? requestedTab
      : inferredTab;
  const productOrders =
    activeTab === LOT_TABS.semiFinished
      ? semiFinishedProducts
      : finishedProducts;
  const productOrdersLoading =
    activeTab === LOT_TABS.semiFinished
      ? semiFinishedProductsLoading
      : finishedProductsLoading;

  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLots = useMemo(() => {
    const activeLots = productOrders.filter(
      (lot) => !isCancelledProductionOrder(lot.status),
    );

    if (!searchKeyword) {
      return activeLots;
    }

    return activeLots.filter((lot) =>
      matchesSearchKeyword(
        [
          lot.id,
          lot.item_code,
          lot.description,
          lot.production_order_code,
          lot.lot_no,
          lot.item?.item_name,
          formatProductionOrderStatus(lot.status),
        ],
        searchKeyword,
      ),
    );
  }, [productOrders, searchKeyword]);
  const groupedLots = useMemo(
    () => groupLotsByCreationDate(filteredLots),
    [filteredLots],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: `allProductOrderListScroll:${activeTab}`,
    restoreSignal: `${activeTab}:${filteredLots.length}:${pathname}`,
  });

  const getRouteWithTab = (route: string, tab: LotTab) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("tab", tab);
    return `${route}?${nextSearchParams.toString()}`;
  };

  const handleTabChange = (tab: LotTab) => {
    router.replace(getRouteWithTab(pathname, tab), { scroll: false });
  };

  const handleClick = (lotId: string | number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(
      getRouteWithTab(`${PRODUCT_ORDERS_ROUTE}/${lotId}`, activeTab),
      { scroll: false },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <ListProductOrderHeader />
        <div
          className="mt-2 flex gap-1 border-b border-gray-200"
          role="tablist"
          aria-label="Loại tổng hợp lô"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === LOT_TABS.semiFinished}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === LOT_TABS.semiFinished
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange(LOT_TABS.semiFinished)}
          >
            Tổng hợp lô bán thành phẩm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === LOT_TABS.finished}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === LOT_TABS.finished
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange(LOT_TABS.finished)}
          >
            Tổng hợp lô thành phẩm
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        <table className="w-full min-w-[1680px] caption-bottom border-t text-[13px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Mã sản phẩm
              </TableHead>
              <TableHead className="w-[360px] border-r px-3 font-bold text-gray-900">
                Tên sản phẩm
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Số lô
              </TableHead>
              <TableHead className="border-r px-3 text-right font-bold text-gray-900">
                Cỡ lô
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Đơn vị tính
              </TableHead>
              <TableHead className="border-r px-3 text-center font-bold text-gray-900">
                NSX
              </TableHead>
              <TableHead className="border-r px-3 text-center font-bold text-gray-900">
                HSD
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Trạng thái
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Gửi PYCLM
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Cấp HSL giấy
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Nhận HSL giấy
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Nhận PXK
              </TableHead>
              <TableHead className="border-r px-3 font-bold text-gray-900">
                Nhận PKN
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productOrdersLoading ? (
              <ProductOrderTableSkeleton />
            ) : groupedLots.length > 0 ? (
              groupedLots.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell
                      colSpan={13}
                      className="border-r px-3 font-semibold text-gray-900"
                    >
                      {group.label}
                    </TableCell>
                  </TableRow>
                  {group.lots.map((lot) => {
                    const pyclmSent =
                      lot?.pyclm?.isSent ??
                      getBooleanValue(lot, [
                        "pyclm_is_sent",
                        "is_pyclm_sent",
                        "sampling_request_sent",
                      ]);
                    const productionStatus = formatProductionOrderStatus(
                      lot.status,
                    );
                    const batchRecordIssued = getDocumentControlValue(lot, [
                      "batch_record_issued_at",
                    ]);
                    const batchRecordReceived = getDocumentControlValue(lot, [
                      "batch_record_received_at",
                    ]);
                    const warehouseReleaseReceived = getDocumentControlValue(
                      lot,
                      ["warehouse_release_received_at"],
                    );
                    const testCertificateReceived = getDocumentControlValue(
                      lot,
                      ["test_certificate_received_at"],
                    );

                    return (
                      <TableRow
                        key={lot.id}
                        className={`cursor-pointer ${
                          activeLotId === String(lot.id)
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleClick(lot.id)}
                      >
                        <TableCell className="border-r px-3 font-medium text-gray-900">
                          {lot.item_code}
                        </TableCell>
                        <TableCell className="max-w-[360px] whitespace-normal border-r px-3 text-gray-900">
                          {lot.item?.item_name ?? lot.description}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {lot.lot_no}
                        </TableCell>
                        <TableCell className="border-r px-3 text-right">
                          {formatNumber(
                            lot.planned_quatity ?? lot.planned_quantity,
                          )}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          {lot.unit}
                        </TableCell>
                        <TableCell className="border-r px-3 text-center">
                          {formatCompactDate(lot.date_manufacture)}
                        </TableCell>
                        <TableCell className="border-r px-3 text-center">
                          {formatCompactDate(lot.expire_date)}
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <ProductionStatusCell status={productionStatus} />
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <StatusCell
                            checked={Boolean(pyclmSent)}
                            checkedLabel="Đã gửi"
                            uncheckedLabel="Chưa gửi"
                          />
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <StatusCell
                            checked={Boolean(batchRecordIssued)}
                            checkedLabel="Đã cấp"
                            uncheckedLabel="Chưa cấp"
                          />
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <StatusCell
                            checked={Boolean(batchRecordReceived)}
                            checkedLabel="Đã nhận"
                            uncheckedLabel="Chưa nhận"
                          />
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <StatusCell
                            checked={Boolean(warehouseReleaseReceived)}
                            checkedLabel="Đã nhận"
                            uncheckedLabel="Chưa nhận"
                          />
                        </TableCell>
                        <TableCell className="border-r px-3">
                          <StatusCell
                            checked={Boolean(testCertificateReceived)}
                            checkedLabel="Đã nhận"
                            uncheckedLabel="Chưa nhận"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))
            ) : null}
          </TableBody>
        </table>

        {!productOrdersLoading && filteredLots.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching ? "Không tìm thấy lô phù hợp." : "Chưa có lô nào."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
