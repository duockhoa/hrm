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
  ItemRawMaterial,
  ListRawMaterialHeader,
} from "@/features/raw-materials";
import { API_ROUTES } from "@/lib/api-routes";
import { usePathname, useRouter } from "next/navigation";

export default function RawMaterialsPage() {
  const router = useRouter();
  const [filters, setFilters] = useFilterState<ListFilters>({});
  const pathname = usePathname();
  const {
    items: filteredRawMaterials,
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
    API_ROUTES.items.rawMaterials,
    "rawMaterialListScroll",
    filters,
  );
  const activeRawMaterialId = pathname.startsWith("/raw-materials/")
    ? decodeURIComponent(pathname.replace("/raw-materials/", ""))
    : null;
  const handleClick = (rawMaterialId: string) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/raw-materials/${rawMaterialId}`, { scroll: false });
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
        <ListRawMaterialHeader />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isInitialLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <ItemRawMaterial
              key={index}
              rawMaterial={null}
              onClick={() => {}}
            />
          ))
        ) : filteredRawMaterials.length > 0 ? (
          filteredRawMaterials.map((rawMaterial) => (
            <ItemRawMaterial
              key={rawMaterial.item_code}
              rawMaterial={rawMaterial}
              isActive={activeRawMaterialId === rawMaterial.item_code}
              onClick={() => handleClick(rawMaterial.item_code)}
            />
          ))
        ) : !error ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy nguyên liệu phù hợp."
              : "Chưa có nguyên liệu nào."}
          </p>
        ) : null}
        <ItemCatalogLoadStatus
          sentinelRef={sentinelRef}
          count={filteredRawMaterials.length}
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
