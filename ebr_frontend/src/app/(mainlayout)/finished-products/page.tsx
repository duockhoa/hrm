"use client";

import { ItemProduct, ListFinishProductHeader } from "@/features/finished-products";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import { API_ROUTES } from "@/lib/api-routes";
import { sortByItemCodeDesc } from "@/lib/item-sort";
import { itemsService } from "@/services/index.service";
import useFinishProductStore from "@/store/finish-product.store";
import useSearchStore from "@/store/search.store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

export default function FinishedProductsPage() {
  const {
    finishedProducts,
    finishedProductsLoading,
    setFinishedProducts,
    setIsLoading,
  } = useFinishProductStore();
  const shouldFetchFinishedProducts = finishedProducts.length === 0;
  const { data, isLoading } = useSWR(
    shouldFetchFinishedProducts ? API_ROUTES.items.finishedProducts : null,
    itemsService.fetchFinishedProducts,
  );

  useEffect(() => {
    setIsLoading(isLoading);
    if (data) {
      setFinishedProducts(data);
      setIsLoading(false);
    }
  }, [data, isLoading, setFinishedProducts, setIsLoading]);

  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeProductId = pathname.startsWith("/finished-products/")
    ? decodeURIComponent(pathname.replace("/finished-products/", ""))
    : null;
  const isListLoading = finishedProductsLoading || isLoading;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchKeyword) {
      return sortByItemCodeDesc(finishedProducts);
    }

    return sortByItemCodeDesc(
      finishedProducts.filter((product) =>
        matchesSearchKeyword(
          [product.item_code, product.item_name, product.dk_code],
          searchKeyword,
        ),
      ),
    );
  }, [finishedProducts, searchKeyword]);

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
        {isListLoading ? (
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
              ? "Khong tim thay thanh pham phu hop."
              : "Chua co thanh pham nao."}
          </p>
        )}
      </div>
    </div>
  );
}
