"use client";

import { ItemProduct, ListFinishProductHeader } from "@/features/finished-products";
import { getSearchScopePath } from "@/lib/search-utils";
import { Button } from "@/components/ui/button";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { sortByItemCodeDesc } from "@/lib/item-sort";
import { itemsService } from "@/services/index.service";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import useSWR from "swr";

export default function FinishedProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  ).trim();
  const isSearching = searchKeyword.length > 0;
  const { data, error, isLoading, mutate } = useSWR(
    isSearching
      ? [API_ROUTES.items.finishedProducts, searchKeyword]
      : API_ROUTES.items.finishedProducts,
    () => itemsService.fetchFinishedProducts(searchKeyword),
  );
  const activeProductId = pathname.startsWith("/finished-products/")
    ? decodeURIComponent(pathname.replace("/finished-products/", ""))
    : null;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => sortByItemCodeDesc(data ?? []), [data]);

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "finishedProductListScroll",
    restoreSignal: `${filteredProducts.length}:${pathname}`,
  });

  const handleClick = (productId: string) => {
    saveScrollPosition({ restoreOnNextFrame: true });
    router.push(`/finished-products/${productId}`, { scroll: false });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <div className="sticky top-0 z-10 w-full bg-white p-2">
        <ListFinishProductHeader />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-0">
        {error ? (
          <div role="alert" className="p-4 text-center text-sm text-red-600">
            Không thể tải danh mục thành phẩm.
            <Button type="button" variant="link" onClick={() => void mutate()}>
              Thử lại
            </Button>
          </div>
        ) : isLoading ? (
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
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy thành phẩm phù hợp."
              : "Chưa có thành phẩm nào."}
          </p>
        )}
      </div>
    </div>
  );
}
