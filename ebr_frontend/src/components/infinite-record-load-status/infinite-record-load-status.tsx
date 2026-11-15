"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";

export default function InfiniteRecordLoadStatus({
  sentinelRef,
  count,
  error,
  loading,
  hasMore,
  onRetry,
  onLoadMore,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  count: number;
  error: unknown;
  loading: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  return (
    <div
      ref={sentinelRef}
      className="min-h-12 shrink-0 p-3 text-center text-sm text-gray-500"
      aria-live="polite"
    >
      {error ? (
        <div role="alert" className="text-red-600">
          {count ? "Không thể tải thêm bản ghi." : "Không thể tải danh sách."}
          <Button type="button" variant="link" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <span role="status">Đang tải bản ghi...</span>
      ) : hasMore ? (
        <Button type="button" variant="ghost" onClick={onLoadMore}>
          Tải thêm
        </Button>
      ) : null}
    </div>
  );
}
