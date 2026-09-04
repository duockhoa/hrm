"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductionOrderDeviationDetail } from "@/features/production-order-deviations";
import useMobile from "@/hooks/use-mobile";
import { API_ROUTES } from "@/lib/api-routes";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { productionOrderDeviationsService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import useSWR from "swr";

type DeviationUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type DeviationProductionOrder = {
  id?: string | number | null;
  production_order_code?: string | null;
  lot_no?: string | null;
  item_code?: string | null;
  description?: string | null;
  item?: {
    item_name?: string | null;
  } | null;
};

type ProductionOrderDeviation = {
  id?: string | number | null;
  production_order_id?: string | number | null;
  deviation_content?: string | null;
  handling_plan?: string | null;
  handling_result?: string | null;
  cause?: string | null;
  cause_classification?: string | null;
  affected_quantity?: string | number | null;
  affected_quantity_unit?: string | null;
  handled_quantity?: string | number | null;
  handled_quantity_unit?: string | null;
  destroyed_quantity?: string | number | null;
  destroyed_quantity_unit?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reporter?: DeviationUser | null;
  approver?: DeviationUser | null;
  productionOrder?: DeviationProductionOrder | null;
  production_order?: DeviationProductionOrder | null;
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const formatQuantityWithUnit = (
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
) => [formatText(quantity), unit].filter(Boolean).join(" ");

const getUserLabel = (user: DeviationUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

const getProductionOrder = (deviation: ProductionOrderDeviation) =>
  deviation.productionOrder ?? deviation.production_order ?? null;

const getProductionOrderLabel = (deviation: ProductionOrderDeviation) => {
  const productionOrder = getProductionOrder(deviation);

  return (
    productionOrder?.production_order_code ??
    productionOrder?.lot_no ??
    deviation.production_order_id ??
    ""
  );
};

const getLotLabel = (deviation: ProductionOrderDeviation) => {
  const productionOrder = getProductionOrder(deviation);

  return productionOrder?.lot_no ?? "";
};

const getProductLabel = (deviation: ProductionOrderDeviation) => {
  const productionOrder = getProductionOrder(deviation);

  return (
    productionOrder?.item?.item_name ??
    productionOrder?.description ??
    productionOrder?.item_code ??
    ""
  );
};

const getDeviationDetailTitle = (
  deviation: ProductionOrderDeviation | null | undefined,
) => {
  if (!deviation) {
    return "";
  }

  const productLabel = getProductLabel(deviation);
  const lotLabel = getLotLabel(deviation);

  return [productLabel, lotLabel].filter(Boolean).join(" - ");
};

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

const groupDeviationsByCreatedDate = (
  deviations: ProductionOrderDeviation[],
) => {
  const groups: {
    key: string;
    label: string;
    deviations: ProductionOrderDeviation[];
  }[] = [];
  const groupMap = new Map<string, (typeof groups)[number]>();

  deviations.forEach((deviation) => {
    const createdAt = deviation.created_at;
    const key = getDateGroupKey(createdAt);
    const existingGroup = groupMap.get(key);

    if (existingGroup) {
      existingGroup.deviations.push(deviation);
      return;
    }

    const group = {
      key,
      label: formatDateGroup(createdAt),
      deviations: [deviation],
    };

    groups.push(group);
    groupMap.set(key, group);
  });

  return groups;
};

function DeviationsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="border-r">
              <Skeleton className="h-4 w-full min-w-16" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyDetailState() {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded border border-dashed bg-white p-8 text-center text-sm text-gray-500">
      Chọn một sai lệch trong bảng để xem chi tiết.
    </div>
  );
}

export default function ProductionOrderDeviationsPage() {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [selectedDeviationId, setSelectedDeviationId] = useState<
    string | number | null
  >(null);
  const [detailHeaderActionsElement, setDetailHeaderActionsElement] =
    useState<HTMLDivElement | null>(null);
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;

  const {
    data: deviations,
    error,
    isLoading,
  } = useSWR<ProductionOrderDeviation[]>(
    API_ROUTES.productionOrderDeviations.base,
    () => productionOrderDeviationsService.fetchProductionOrderDeviations(),
  );

  const filteredDeviations = useMemo(() => {
    const list = deviations ?? [];

    if (!searchKeyword) {
      return list;
    }

    return list.filter((deviation) =>
      matchesSearchKeyword(
        [
          deviation.id,
          deviation.production_order_id,
          deviation.created_at,
          getProductionOrderLabel(deviation),
          getLotLabel(deviation),
          getProductLabel(deviation),
          deviation.deviation_content,
          deviation.handling_plan,
          deviation.handling_result,
          deviation.cause,
          deviation.cause_classification,
          getUserLabel(deviation.reporter),
          getUserLabel(deviation.approver),
        ],
        searchKeyword,
      ),
    );
  }, [deviations, searchKeyword]);
  const groupedDeviations = useMemo(
    () => groupDeviationsByCreatedDate(filteredDeviations),
    [filteredDeviations],
  );
  const selectedDeviation = useMemo(
    () =>
      (deviations ?? []).find(
        (deviation) =>
          selectedDeviationId !== null &&
          deviation.id !== null &&
          deviation.id !== undefined &&
          String(deviation.id) === String(selectedDeviationId),
      ),
    [deviations, selectedDeviationId],
  );
  const selectedDeviationTitle =
    getDeviationDetailTitle(selectedDeviation) ||
    (selectedDeviationId ? `#${selectedDeviationId}` : "");

  const selectedDeviationExists = filteredDeviations.some(
    (deviation) =>
      selectedDeviationId !== null &&
      deviation.id !== null &&
      deviation.id !== undefined &&
      String(deviation.id) === String(selectedDeviationId),
  );
  const shouldShowMobileDetail = isMobile && selectedDeviationId !== null;

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/production-order-deviations">Sai lệch</Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        {error ? (
          <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách sai lệch.
          </div>
        ) : (
          <table className="w-full min-w-[1200px] caption-bottom border-t text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-72 border-r px-3 font-bold text-gray-900">
                  Sản phẩm
                </TableHead>
                <TableHead className="w-32 border-r px-3 font-bold text-gray-900">
                  Số lô
                </TableHead>
                <TableHead className="w-80 border-r px-3 font-bold text-gray-900">
                  Nội dung sai lệch
                </TableHead>
                <TableHead className="w-48 border-r px-3 font-bold text-gray-900">
                  Nguyên nhân
                </TableHead>
                <TableHead className="w-48 border-r px-3 font-bold text-gray-900">
                  Phân loại nguyên nhân
                </TableHead>
                <TableHead className="w-40 border-r px-3 font-bold text-gray-900">
                  SL ảnh hưởng
                </TableHead>
                <TableHead className="w-40 border-r px-3 font-bold text-gray-900">
                  SL xử lý
                </TableHead>
                <TableHead className="w-40 px-3 font-bold text-gray-900">
                  Người báo cáo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DeviationsTableSkeleton />
              ) : groupedDeviations.length > 0 ? (
                groupedDeviations.map((group) => (
                  <Fragment key={group.key}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell
                        colSpan={8}
                        className="border-r px-3 font-semibold text-gray-900"
                      >
                        {group.label}
                      </TableCell>
                    </TableRow>
                    {group.deviations.map((deviation, index) => {
                      const deviationId = deviation.id;
                      const isSelectable =
                        deviationId !== null && deviationId !== undefined;
                      const isSelected =
                        selectedDeviationId !== null &&
                        deviationId !== null &&
                        deviationId !== undefined &&
                        String(selectedDeviationId) === String(deviationId);

                      return (
                        <TableRow
                          key={deviation.id ?? `${group.key}-${index}`}
                          tabIndex={isSelectable ? 0 : undefined}
                          aria-selected={isSelected}
                          data-state={isSelected ? "selected" : undefined}
                          className={`${
                            isSelectable ? "cursor-pointer" : ""
                          } ${
                            isSelected
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            if (isSelectable) {
                              setSelectedDeviationId(deviationId);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!isSelectable) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedDeviationId(deviationId);
                            }
                          }}
                        >
                          <TableCell className="max-w-72 whitespace-normal break-words border-r px-3">
                            {getProductLabel(deviation)}
                          </TableCell>
                          <TableCell className="border-r px-3">
                            {getLotLabel(deviation)}
                          </TableCell>
                          <TableCell className="max-w-80 whitespace-normal break-words border-r px-3">
                            {deviation.deviation_content}
                          </TableCell>
                          <TableCell className="max-w-48 whitespace-normal break-words border-r px-3">
                            {deviation.cause}
                          </TableCell>
                          <TableCell className="max-w-48 whitespace-normal break-words border-r px-3">
                            {deviation.cause_classification}
                          </TableCell>
                          <TableCell className="border-r px-3">
                            {formatQuantityWithUnit(
                              deviation.affected_quantity,
                              deviation.affected_quantity_unit,
                            )}
                          </TableCell>
                          <TableCell className="border-r px-3">
                            {formatQuantityWithUnit(
                              deviation.handled_quantity,
                              deviation.handled_quantity_unit,
                            )}
                          </TableCell>
                          <TableCell className="px-3">
                            {getUserLabel(deviation.reporter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    {isSearching
                      ? "Không tìm thấy sai lệch phù hợp."
                      : "Chưa có sai lệch nào."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        )}
      </div>
    </div>
  );

  const detailPanel = selectedDeviationId ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="shrink-0"
              href="/production-order-deviations"
              onClick={() => setSelectedDeviationId(null)}
            >
              Sai lệch
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{selectedDeviationTitle}</p>
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
              onClick={() => setSelectedDeviationId(null)}
              aria-label="Thoát detail"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-2 md:p-4">
        <ProductionOrderDeviationDetail
          id={selectedDeviationId}
          onClose={() => setSelectedDeviationId(null)}
          showCloseButton={false}
          externalActionsContainer={detailHeaderActionsElement}
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
          defaultSize={selectedDeviationExists ? 55 : 100}
          minSize={35}
          className="min-h-0 min-w-0 overflow-hidden"
        >
          {listPanel}
        </ResizablePanel>

        {selectedDeviationId ? (
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
