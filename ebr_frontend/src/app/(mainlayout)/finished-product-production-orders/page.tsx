"use client";

import { HeaderListFinishedProductLot } from "@/features/finished-product-production-orders";
import { Button } from "@/components/ui/button";
import { ItemProductOrder } from "@/features/production-orders";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { isCancelledProductionOrder } from "@/lib/production-order-status";
import { getSearchScopePath } from "@/lib/search-utils";
import { productOrdersService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useMemo, useRef } from "react";
import useSWR from "swr";

const FINISHED_PRODUCT_PRODUCTION_ORDERS_ROUTE =
  "/finished-product-production-orders";

const getLotCreationDate = (lot: any) => lot?.creation_date ?? lot?.created_at;

const formatDateGroup = (value: string | null | undefined) => {
  if (!value) {
    return "Khong ro ngay tao";
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

export default function FinishedProductProductionOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  ).trim();
  const isSearching = searchKeyword.length > 0;
  const { data: productOrders = [], error, isLoading, mutate } = useSWR(
    isSearching
      ? [API_ROUTES.productionOrders.finishedProducts, searchKeyword]
      : API_ROUTES.productionOrders.finishedProducts,
    () => productOrdersService.searchFinishedProducts(searchKeyword),
  );
  const activeLotId = pathname.startsWith(
    `${FINISHED_PRODUCT_PRODUCTION_ORDERS_ROUTE}/`,
  )
    ? decodeURIComponent(
        pathname.replace(`${FINISHED_PRODUCT_PRODUCTION_ORDERS_ROUTE}/`, ""),
      )
    : null;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLots = useMemo(
    () => productOrders.filter((lot) => !isCancelledProductionOrder(lot.status)),
    [productOrders],
  );
  const groupedLots = useMemo(
    () => groupLotsByCreationDate(filteredLots),
    [filteredLots],
  );

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "productOrderListScroll",
    restoreSignal: `${filteredLots.length}:${pathname}`,
  });

  const handleClick = (lotId: string | number) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`${FINISHED_PRODUCT_PRODUCTION_ORDERS_ROUTE}/${lotId}`, {
      scroll: false,
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <HeaderListFinishedProductLot />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <div role="alert" className="p-4 text-center text-sm text-red-600">
            Không thể tải danh sách lô.
            <Button type="button" variant="link" onClick={() => void mutate()}>
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <ItemProductOrder
              key={index}
              productOrder={null}
              onClick={() => {}}
            />
          ))
        ) : groupedLots.length > 0 ? (
          groupedLots.map((group) => (
            <Fragment key={group.key}>
              <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                {group.label}
              </div>
              {group.lots.map((lot) => (
                <ItemProductOrder
                  key={lot.id}
                  productOrder={lot}
                  showDocumentControlActions
                  isActive={activeLotId === String(lot.id)}
                  onClick={() => handleClick(lot.id)}
                />
              ))}
            </Fragment>
          ))
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy lô thành phẩm phù hợp."
              : "Chưa có lô thành phẩm nào."}
          </p>
        )}
      </div>
    </div>
  );
}
