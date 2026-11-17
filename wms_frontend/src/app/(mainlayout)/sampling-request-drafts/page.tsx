"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import { useSkeletonRowCount } from "@/hooks/use-skeleton-row-count";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";
import useUserStore from "@/store/user.store";
import {
  COMBINED_SAMPLING_DRAFTS_URL,
  type ReceiptSamplingDraft,
} from "@/services/warehouse-receipt-sampling-drafts.service";
import {
  formatExpiryDate,
  formatReceiptQuantity,
} from "@/features/warehouse-receipt-items/receipt-formatters";
import ReceiptSamplingSendButton from "@/features/warehouse-receipt-items/receipt-sampling-send-button";

const rawColumns = [
  "Mã hàng",
  "Tên hàng",
  "Số lượng",
  "Đơn vị tính",
  "Nhà cung cấp",
  "Số lô",
  "Hạn dùng",
  "Vị trí lấy mẫu",
];

export default function SamplingRequestDraftsPage() {
  const columns = rawColumns;
  const userId = useUserStore((state) => state.user?.id);
  const scope = getSearchScopePath(usePathname());
  const keyword = useSearchStore((state) => state.searchByPath[scope] ?? "");
  const search = useDebouncedValue(keyword.trim());
  const skeletonRows = useSkeletonRowCount();
  const {
    records,
    total,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    containerRef,
    sentinelRef,
    loadMore,
    retry,
    mutate,
  } = useInfiniteRecordList<ReceiptSamplingDraft>({
    url: COMBINED_SAMPLING_DRAFTS_URL,
    filters: { search: search || undefined },
    storageKey: "receiptSamplingDraftListScroll",
    revalidateOnMount: true,
    enabled: Boolean(userId),
    cacheScope: userId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-3">
        <div className="flex items-center gap-2">
          <AiOutlineRight />
          <h1>Danh sách gửi PYCLM</h1>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ReceiptSamplingSendButton
            key={userId}
            disabled={
              !userId || isLoading || Boolean(error) || (!search && total === 0)
            }
            onSent={() => mutate()}
          />
        </div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1200px] text-[13px]">
          <TableHeader className="sticky top-0 z-10 bg-gray-50">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className="border-r px-3 font-bold text-gray-900 last:border-r-0"
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }, (_, row) => (
                <TableRow key={row}>
                  {columns.map((column) => (
                    <TableCell key={column} className="px-3">
                      <Skeleton className="h-5 w-full min-w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length ? (
              records.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="border-r px-3">
                    {draft.request_type === "TP" ? (
                      draft.item_code
                    ) : draft.item_code ? (
                      <Link
                        href={`/items/${encodeURIComponent(draft.item_code)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {draft.item_code}
                      </Link>
                    ) : (
                      ""
                    )}
                  </TableCell>
                  <TableCell className="max-w-80 whitespace-pre-wrap border-r px-3">
                    {draft.item_name}
                  </TableCell>
                  <TableCell className="border-r px-3 text-right">
                    {formatReceiptQuantity(draft.quantity)}
                  </TableCell>
                  <TableCell className="border-r px-3">{draft.unit}</TableCell>
                  <TableCell className="max-w-80 whitespace-pre-wrap border-r px-3">
                    {draft.request_type === "TP"
                      ? "Cty CP Dược Khoa"
                      : draft.supplier_name}
                  </TableCell>
                  <TableCell className="border-r px-3">
                    {draft.request_type === "TP" ? (
                      draft.lot_number
                    ) : (
                      <Link
                        href={`/home/${draft.warehouse_receipt_item_id}`}
                        className="text-blue-600 hover:underline"
                        aria-label={`Xem kiểm hàng nhập kho ${draft.lot_number ?? draft.warehouse_receipt_item_id}`}
                      >
                        {draft.lot_number ||
                          `#${draft.warehouse_receipt_item_id}`}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap border-r px-3">
                    {formatExpiryDate(draft.expiry_date) ||
                      draft.expiry_date_text ||
                      ""}
                  </TableCell>
                  <TableCell className="max-w-80 whitespace-pre-wrap px-3">
                    {draft.location}
                  </TableCell>
                </TableRow>
              ))
            ) : !error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-gray-500"
                >
                  {search
                    ? "Không tìm thấy bản nháp PYCLM phù hợp."
                    : "Chưa có bản nháp PYCLM nào."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </table>
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
    </div>
  );
}
