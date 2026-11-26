"use client";
import {
  ListFilterButton,
  type ListFilters,
} from "@/components/list-filter-button";
import { catalogFilters } from "@/lib/basic-list-filters";
import { useState as useFilterState } from "react";

import { useInfiniteItemCatalog } from "@/hooks/use-infinite-item-catalog";
import ItemCatalogLoadStatus from "@/components/item-catalog-load-status/item-catalog-load-status";

import {
  ItemProduct,
  ListFinishProductHeader,
} from "@/features/finished-products";
import { API_ROUTES } from "@/lib/api-routes";
import { usePathname, useRouter } from "next/navigation";

export default function FinishedProductsPage() {
  const router = useRouter();
  const [filters, setFilters] = useFilterState<ListFilters>({});
  const pathname = usePathname();
  const {
    items: filteredProducts,
    error,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isSearching,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
  } = useInfiniteItemCatalog(
    API_ROUTES.items.finishedProducts,
    "finishedProductListScroll",
    filters,
  );
  const activeProductId = pathname.startsWith("/finished-products/")
    ? decodeURIComponent(pathname.replace("/finished-products/", ""))
    : null;
  const handleClick = (productId: string) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/finished-products/${productId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full pr-12 bg-white p-2">
        <div className="absolute right-2 top-2">
          <ListFilterButton
            groups={catalogFilters}
            filters={filters}
            onApply={setFilters}
            disabled={false}
            title="Lọc dữ liệu"
          />
        </div>
        <ListFinishProductHeader />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isInitialLoading ? (
          Array.from({ length: 10 }).map((_, idx) => (
            <ItemProduct key={idx} product={null} onClick={() => {}} />
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ItemProduct
              key={product.item_code}
              product={product}
              isActive={activeProductId === product.item_code}
              onClick={() => handleClick(product.item_code)}
            />
          ))
        ) : !error ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy thành phẩm phù hợp."
              : "Chưa có thành phẩm nào."}
          </p>
        ) : null}
        <ItemCatalogLoadStatus
          sentinelRef={sentinelRef}
          count={filteredProducts.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
