"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import axiosClient from "@/lib/axios-client";
import { registerItemCatalogRefresh } from "@/lib/item-catalog-refresh";
import { useScrollRestoration } from "./use-scroll-restoration";

export const RECORD_LIST_PAGE_SIZE = 300;

export type RecordListPage<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

type Filters = Record<string, string | number | boolean | undefined>;
type PageKey = readonly [string, string, number, "record-infinite"];

export function useInfiniteRecordList<T extends { id: string | number }>({
  url,
  filters,
  enabled = true,
  storageKey,
  fetchPage,
}: {
  url: string;
  filters: Filters;
  enabled?: boolean;
  storageKey: string;
  fetchPage?: (page: number, limit: number) => Promise<RecordListPage<T>>;
}) {
  const pathname = usePathname();
  const filterKey = JSON.stringify(
    Object.fromEntries(
      Object.keys(filters)
        .sort()
        .map((key) => [key, filters[key]]),
    ),
  );
  const queryKey = JSON.stringify([url, filterKey]);
  const scrollKey = `${storageKey}:${queryKey}`;
  const previousQuery = useRef(queryKey);
  const pending = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<RecordListPage<T>>(
      (index, previous: RecordListPage<T> | null): PageKey | null => {
        if (
          !enabled ||
          (previous &&
            (previous.data.length === 0 ||
              previous.page * previous.limit >= previous.total))
        )
          return null;
        return [url, filterKey, index + 1, "record-infinite"];
      },
      async ([endpoint, serializedFilters, page]: PageKey) => {
        if (fetchPage) return fetchPage(page, RECORD_LIST_PAGE_SIZE);
        const response = await axiosClient.get<RecordListPage<T>>(endpoint, {
          params: {
            ...JSON.parse(serializedFilters),
            page,
            limit: RECORD_LIST_PAGE_SIZE,
          },
        });
        return response.data;
      },
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      },
    );

  useLayoutEffect(() => {
    if (previousQuery.current === queryKey) return;
    previousQuery.current = queryKey;
    try {
      sessionStorage.removeItem(scrollKey);
    } catch {
      /* Optional storage. */
    }
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (size !== 1)
      void setSize(1).catch(() => {
        /* Displayed in the list. */
      });
  }, [queryKey, scrollKey, size, setSize]);

  useEffect(
    () =>
      enabled ? registerItemCatalogRefresh(url, () => mutate()) : undefined,
    [enabled, url, mutate],
  );

  const records = useMemo(
    () =>
      Array.from(
        new Map(
          (data ?? [])
            .flatMap((page) => page.data)
            .map((record) => [String(record.id), record]),
        ).values(),
      ),
    [data],
  );
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(
    lastPage &&
    lastPage.data.length > 0 &&
    lastPage.page * lastPage.limit < lastPage.total,
  );
  const initialLoading = enabled && isLoading && !data;
  const isLoadingMore =
    !error && (initialLoading || (isValidating && size > (data?.length ?? 0)));
  const loadMore = useCallback(() => {
    if (
      !enabled ||
      !hasMore ||
      error ||
      isValidating ||
      pending.current.has(queryKey)
    )
      return;
    pending.current.add(queryKey);
    void setSize((current) => current + 1)
      .catch(() => {
        /* Existing rows stay visible; retry is explicit. */
      })
      .finally(() => {
        pending.current.delete(queryKey);
      });
  }, [enabled, hasMore, error, isValidating, queryKey, setSize]);
  const retry = useCallback(() => {
    void mutate().catch(() => {
      /* Displayed in the list. */
    });
  }, [mutate]);

  useEffect(() => {
    const root = containerRef.current;
    const sentinel = sentinelRef.current;
    if (
      !enabled ||
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
  }, [enabled, hasMore, error, isLoadingMore, loadMore]);

  const { saveScrollPosition } = useScrollRestoration({
    ref: containerRef,
    storageKey: scrollKey,
    restoreSignal: `${pathname}:${initialLoading}`,
  });

  return {
    records,
    total: data?.[0]?.total ?? 0,
    error,
    hasMore,
    isLoading: initialLoading,
    isLoadingMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
    mutate,
  };
}
