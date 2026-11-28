"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import { API_ROUTES } from "@/lib/api-routes";
import type { VerificationRecord } from "@/services/warehouse-verification-records.service";
import useSearchStore from "@/store/search.store";
import VerificationRecordForm from "./verification-record-form";
import {
  formatVerificationDay,
  formatVerificationTime,
  recordSubjectLabel,
} from "./verification-record-format";

const route = "/verification-records";

export default function VerificationRecords({
  selectedId,
}: {
  selectedId?: number;
}) {
  const [creating, setCreating] = useState(false);
  const search = useSearchStore((state) => state.searchByPath[route] ?? "");
  const query = useDebouncedValue(search.trim().slice(0, 200));
  const {
    records,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    saveScrollPosition,
  } = useInfiniteRecordList<VerificationRecord>({
    url: API_ROUTES.warehouseVerificationRecords.base,
    filters: { search: query || undefined },
    storageKey: "verificationRecordListScroll",
    revalidateOnMount: true,
  });
  const setSearch = useSearchStore((state) => state.setSearch);
  const groups = new Map<string, VerificationRecord[]>();
  for (const record of records) {
    const day = formatVerificationDay(record.created_at);
    const group = groups.get(day);
    if (group) group.push(record);
    else groups.set(day, [record]);
  }

  function handleSaved() {
    setCreating(false);
    setSearch(route, "");
    retry();
  }

  return (
    <section
      ref={containerRef}
      aria-label="Danh sách biên bản xác minh"
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-white p-2">
        <Link
          href={route}
          scroll={false}
          className="flex items-center gap-2 text-sm"
        >
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          Biên bản xác minh
        </Link>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Tạo biên bản
            </Button>
          </DialogTrigger>
          {creating && (
            <VerificationRecordForm
              onCancel={() => setCreating(false)}
              onSaved={handleSaved}
            />
          )}
        </Dialog>
      </header>

      <div className="flex flex-col gap-2 p-2 pt-0">
        {isLoading
          ? Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                className="min-h-[100px] space-y-2 border-b px-3 py-4"
                aria-hidden="true"
              >
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
            ))
          : Array.from(groups, ([day, entries]) => (
              <section key={day} aria-label={day}>
                <h2 className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900">
                  {day}
                </h2>
                {entries.map((record) => (
                  <Link
                    key={record.id}
                    href={`${route}/${record.id}`}
                    scroll={false}
                    aria-current={selectedId === record.id ? "page" : undefined}
                    onClick={() =>
                      saveScrollPosition({ restoreOnNextFrame: true })
                    }
                    className="flex min-h-[100px] items-center gap-3 border-b border-gray-200 px-3 py-4 hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 aria-[current=page]:bg-blue-50 aria-[current=page]:hover:bg-blue-100"
                  >
                    <div className="min-w-0 flex-1 space-y-1 break-words">
                      <p className="text-sm font-bold text-gray-900">
                        {record.record_code}
                      </p>
                      <p className="text-sm text-gray-700">
                        {recordSubjectLabel(record)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {record.location} ·{" "}
                        {record.createdBy.name || record.createdBy.username}
                      </p>
                    </div>
                    <time
                      dateTime={record.created_at}
                      className="shrink-0 text-xs text-gray-600"
                    >
                      {formatVerificationTime(record.created_at)}
                    </time>
                  </Link>
                ))}
              </section>
            ))}
        {!isLoading && !records.length && !error && !hasMore && (
          <p className="p-4 text-center text-sm text-gray-500">
            {query
              ? "Không tìm thấy biên bản phù hợp."
              : "Chưa có biên bản xác minh."}
          </p>
        )}
        <InfiniteRecordLoadStatus
          sentinelRef={sentinelRef}
          count={records.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </section>
  );
}
