"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useDebouncedValue } from "./use-debounced-value";
import { usePathname } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { getSearchScopePath } from "@/lib/search-utils";
import { registerItemCatalogRefresh } from "@/lib/item-catalog-refresh";
import itemsService, {
  ITEM_CATALOG_PAGE_SIZE,
  type ItemCatalogPage,
} from "@/services/items.service";
import useSearchStore from "@/store/search.store";
import { useScrollRestoration } from "./use-scroll-restoration";

type CatalogPageKey = readonly [string, string, number, "catalog-infinite"];

const pageHasMore = (page: ItemCatalogPage) =>
  page.items.length === ITEM_CATALOG_PAGE_SIZE &&
  (page.total === null || page.skip + page.items.length < page.total);

export function useInfiniteItemCatalog(url: string, scrollStorageKey: string) {
  const pathname = usePathname();
  const scope = getSearchScopePath(pathname);
  const keyword = useSearchStore(
    (state) => state.searchByPath[scope] ?? "",
  ).trim();
  const search = useDebouncedValue(keyword);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pendingLoads = useRef(new Set<string>());
  const previousSearch = useRef(search);
  const storageKey = `${scrollStorageKey}:${encodeURIComponent(search)}`;

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<ItemCatalogPage>(
      (index, previous: ItemCatalogPage | null): CatalogPageKey | null => {
        if (previous && !pageHasMore(previous)) return null;
        return [
          url,
          search,
          index * ITEM_CATALOG_PAGE_SIZE,
          "catalog-infinite",
        ];
      },
      ([endpoint, keyword, skip]: CatalogPageKey) =>
        itemsService.fetchCatalogPage(endpoint, keyword, skip),
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      },
    );

  useLayoutEffect(() => {
    if (previousSearch.current === search) return;
    previousSearch.current = search;
    // A new search starts at the top, even when returning to a cached keyword.
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage is optional. */
    }
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (size !== 1) {
      void setSize(1).catch(() => {
        /* The error is displayed in the list. */
      });
    }
  }, [search, setSize, size, storageKey]);

  useEffect(
    () => registerItemCatalogRefresh(url, () => mutate()),
    [url, mutate],
  );

  const items = useMemo(
    () =>
      Array.from(
        new Map(
          (data ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.item_code, item]),
        ).values(),
      ),
    [data],
  );
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage && pageHasMore(lastPage));
  const isInitialLoading = isLoading && !data;
  const isLoadingMore =
    !error &&
    (isInitialLoading || (isValidating && size > (data?.length ?? 0)));

  const loadMore = useCallback(() => {
    const requestScope = JSON.stringify([url, search]);
    if (
      !hasMore ||
      error ||
      isValidating ||
      pendingLoads.current.has(requestScope)
    )
      return;
    pendingLoads.current.add(requestScope);
    void setSize((current) => current + 1)
      .catch(() => {
        /* Existing items remain visible; retry is explicit. */
      })
      .finally(() => {
        pendingLoads.current.delete(requestScope);
      });
  }, [url, search, hasMore, error, isValidating, setSize]);

  const retry = useCallback(() => {
    void mutate().catch(() => {
      /* The error is displayed in the list. */
    });
  }, [mutate]);

  useEffect(() => {
    const root = containerRef.current;
    const sentinel = sentinelRef.current;
    if (
      !root ||
      !sentinel ||
      !hasMore ||
      error ||
      isLoadingMore ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root, rootMargin: "0px 0px 300px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, error, isLoadingMore, loadMore]);

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey,
    // Appending rows must not restore an older saved scroll offset.
    restoreSignal: `${pathname}:${isInitialLoading}`,
  });

  return {
    items,
    error,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isSearching: search.length > 0,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
  };
}
