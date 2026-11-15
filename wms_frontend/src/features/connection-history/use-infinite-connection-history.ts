"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import useSWRInfinite from "swr/infinite";
import { registerItemCatalogRefresh } from "@/lib/item-catalog-refresh";
import {
  CONNECTION_HISTORY_URL,
  fetchConnectionHistoryCursor,
  type ConnectionHistoryResponse,
  type ConnectionStatus,
} from "./connection-history.service";

export function useInfiniteConnectionHistory(
  enabled: boolean,
  keyword: string,
  status?: ConnectionStatus,
  connectedFrom = "",
  connectedTo = "",
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pending = useRef(new Set<string>());
  const query = JSON.stringify([keyword, status, connectedFrom, connectedTo]);
  const previous = useRef(query);
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<ConnectionHistoryResponse>(
      (index, last: ConnectionHistoryResponse | null) => {
        if (!enabled || (last && !last.meta.next_cursor)) return null;
        return [
          CONNECTION_HISTORY_URL,
          keyword,
          status,
          index === 0 ? null : last!.meta.next_cursor,
          "cursor-infinite",
          connectedFrom,
          connectedTo,
        ] as const;
      },
      ([, term, state, cursor, , from, to]: readonly [
        string,
        string,
        ConnectionStatus | undefined,
        string | null,
        string,
        string,
        string,
      ]) => fetchConnectionHistoryCursor(cursor, state, term, from, to),
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      },
    );
  useLayoutEffect(() => {
    if (previous.current === query) return;
    previous.current = query;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (size !== 1) void setSize(1).catch(() => {});
  }, [query, size, setSize]);
  const refresh = useCallback(async () => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    await setSize(1);
    await mutate();
  }, [setSize, mutate]);
  useEffect(() => {
    if (!enabled || size !== 1 || error || isValidating) return;
    const timer = setInterval(() => {
      if (
        containerRef.current?.scrollTop === 0 &&
        document.visibilityState === "visible"
      )
        void refresh().catch(() => {});
    }, 15_000);
    return () => clearInterval(timer);
  }, [enabled, size, error, isValidating, refresh]);
  useEffect(
    () =>
      enabled
        ? registerItemCatalogRefresh(CONNECTION_HISTORY_URL, refresh)
        : undefined,
    [enabled, refresh],
  );
  const records = useMemo(
    () =>
      Array.from(
        new Map(
          (data ?? []).flatMap((p) => p.data).map((row) => [row.id, row]),
        ).values(),
      ),
    [data],
  );
  const hasMore = Boolean(data?.[data.length - 1]?.meta.next_cursor);
  const loading = enabled && isLoading && !data;
  const loadingMore =
    !error && (loading || (isValidating && size > (data?.length ?? 0)));
  const loadMore = useCallback(() => {
    if (
      !enabled ||
      !hasMore ||
      error ||
      isValidating ||
      pending.current.has(query)
    )
      return;
    pending.current.add(query);
    void setSize((s) => s + 1)
      .catch(() => {})
      .finally(() => pending.current.delete(query));
  }, [enabled, hasMore, error, isValidating, query, setSize]);
  useEffect(() => {
    const root = containerRef.current,
      sentinel = sentinelRef.current;
    if (
      !enabled ||
      !root ||
      !sentinel ||
      !hasMore ||
      error ||
      loadingMore ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: "0px 0px 300px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, error, loadingMore, loadMore]);
  return {
    records,
    summary: data?.[0]?.summary,
    error,
    loading,
    loadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    refresh,
    retry: () => {
      // Reuse cached batches and fetch only the missing batch after an append
      // failure, preserving the existing cursor boundary and scroll position.
      void setSize(size).catch(() => {});
    },
    isValidating,
  };
}
