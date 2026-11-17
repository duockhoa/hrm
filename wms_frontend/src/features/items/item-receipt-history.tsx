"use client";

import Link from "next/link";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import { useWarehouseReceiptAccess } from "@/hooks/use-warehouse-receipt-access";
import {
  WAREHOUSE_RECEIPT_ITEMS_URL,
  type WarehouseReceiptItem,
} from "@/services/warehouse-receipt-items.service";
import {
  formatExpiryDate,
  formatReceiptDateTime,
  formatReceiptQuantity,
} from "@/features/warehouse-receipt-items/receipt-detail";

const columns = [
  "Thời điểm nhập",
  "Số lô",
  "Số lượng",
  "Đơn vị tính",
  "Hạn dùng",
  "Nhà cung cấp",
  "Người nhập",
];

export default function ItemReceiptHistory({ itemCode }: { itemCode: string }) {
  const access = useWarehouseReceiptAccess();
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
  } = useInfiniteRecordList<WarehouseReceiptItem>({
    url: WAREHOUSE_RECEIPT_ITEMS_URL,
    enabled: access.canRead,
    cacheScope: access.cacheScope,
    filters: { item_code: itemCode },
    storageKey: "itemReceiptHistoryScroll",
  });

  if (!access.canRead) return null;

  return (
    <section
      aria-label="Các lần kiểm hàng nhập kho"
      className="w-full max-w-4xl overflow-hidden rounded border bg-white shadow-md"
    >
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 className="text-lg font-semibold">Các lần kiểm hàng nhập kho</h2>
        {!isLoading && !error && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {total.toLocaleString("vi-VN")}
          </span>
        )}
      </div>
      <div ref={containerRef} className="max-h-[480px] overflow-auto">
        <table className="w-full min-w-[850px] text-sm">
          <TableHeader className="sticky top-0 z-10 bg-gray-50">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="px-3">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, row) => (
                <TableRow key={row}>
                  {columns.map((column) => (
                    <TableCell key={column} className="px-3">
                      <Skeleton className="h-5 w-full min-w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length ? (
              records.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="whitespace-nowrap px-3">
                    {formatReceiptDateTime(receipt.received_at)}
                  </TableCell>
                  <TableCell className="px-3">
                    <Link
                      href={`/home/${receipt.id}`}
                      className="text-blue-600 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2"
                      aria-label={`Xem kiểm hàng nhập kho số lô ${receipt.lot_number}`}
                    >
                      {receipt.lot_number}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    {formatReceiptQuantity(receipt.quantity)}
                  </TableCell>
                  <TableCell className="px-3">{receipt.unit}</TableCell>
                  <TableCell className="whitespace-nowrap px-3">
                    {formatExpiryDate(receipt.expiry_date)}
                  </TableCell>
                  <TableCell className="px-3">
                    {receipt.supplier?.card_name ?? receipt.supplier_name}
                  </TableCell>
                  <TableCell className="px-3">
                    {receipt.enteredBy?.name || receipt.enteredBy?.username}
                  </TableCell>
                </TableRow>
              ))
            ) : !error ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-gray-500"
                >
                  Chưa có lần kiểm hàng nhập kho nào cho nguyên liệu này.
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
    </section>
  );
}
