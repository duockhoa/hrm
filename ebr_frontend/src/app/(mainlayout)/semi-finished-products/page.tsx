"use client";

import { useInfiniteItemCatalog } from "@/hooks/use-infinite-item-catalog";
import ItemCatalogLoadStatus from "@/components/item-catalog-load-status/item-catalog-load-status";

import {
  ItemSemiFinishProduct,
  ListSemiFinishProductHeader,
} from "@/features/semi-finished-products";
import { API_ROUTES } from "@/lib/api-routes";
import { usePathname, useRouter } from "next/navigation";

export default function SemiFinishProducts() {
  const router = useRouter();
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
    API_ROUTES.items.semiFinishedProducts,
    "semiFinishedProductListScroll",
  );
  const activeProductId = pathname.startsWith("/semi-finished-products/")
    ? decodeURIComponent(pathname.replace("/semi-finished-products/", ""))
    : null;
  const handleClick = (productId: string) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/semi-finished-products/${productId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <ListSemiFinishProductHeader />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {isInitialLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <ItemSemiFinishProduct
              key={index}
              product={null}
              onClick={() => {}}
            />
          ))
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ItemSemiFinishProduct
              key={product.item_code}
              product={product}
              isActive={activeProductId === product.item_code}
              onClick={() => handleClick(product.item_code)}
            />
          ))
        ) : !error ? (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy bán thành phẩm phù hợp."
              : "Chưa có bán thành phẩm nào."}
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
