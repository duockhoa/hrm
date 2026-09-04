"use client";

import {
  ItemSemiFinishProduct,
  ListSemiFinishProductHeader,
} from "@/features/semi-finished-products";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import { API_ROUTES } from "@/lib/api-routes";
import { sortByItemCodeDesc } from "@/lib/item-sort";
import { itemsService } from "@/services/index.service";
import { useScrollRestoration } from "@/hooks/use-scroll-restoration";
import useSearchStore from "@/store/search.store";
import useSemiFinishProductStore from "@/store/semi-finish-products.store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

export default function SemiFinishProducts() {
  const {
    semiFinishedProducts,
    semiFinishedProductsLoading,
    setSemiFinishedProducts,
    setIsLoading,
  } = useSemiFinishProductStore();
  const shouldFetchSemiFinishedProducts = semiFinishedProducts.length === 0;
  const { data, isLoading } = useSWR(
    shouldFetchSemiFinishedProducts ? API_ROUTES.items.semiFinishedProducts : null,
    itemsService.fetchSemiFinishedProducts,
  );

  useEffect(() => {
    setIsLoading(isLoading);
    if (data) {
      setSemiFinishedProducts(data);
      setIsLoading(false);
    }
  }, [data, isLoading, setIsLoading, setSemiFinishedProducts]);

  const router = useRouter();
  const pathname = usePathname();
  const searchScopePath = getSearchScopePath(pathname);
  const searchKeyword = useSearchStore(
    (state) => state.searchByPath[searchScopePath] ?? "",
  );
  const isSearching = searchKeyword.trim().length > 0;
  const activeProductId = pathname.startsWith("/semi-finished-products/")
    ? decodeURIComponent(pathname.replace("/semi-finished-products/", ""))
    : null;
  const isListLoading = semiFinishedProductsLoading || isLoading;
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchKeyword) {
      return sortByItemCodeDesc(semiFinishedProducts);
    }

    return sortByItemCodeDesc(
      semiFinishedProducts.filter((product) =>
        matchesSearchKeyword(
          [product.item_code, product.item_name, product.dk_code],
          searchKeyword,
        ),
      ),
    );
  }, [semiFinishedProducts, searchKeyword]);

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: "semiFinishedProductListScroll",
    restoreSignal: `${filteredProducts.length}:${pathname}`,
  });

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
        {isListLoading ? (
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
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {isSearching
              ? "Không tìm thấy bán thành phẩm phù hợp."
              : "Chưa có bán thành phẩm nào."}
          </p>
        )}
      </div>
    </div>
  );
}
