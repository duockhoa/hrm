"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSkeletonRowCount } from "@/hooks/use-skeleton-row-count";
import { useWarehouseReceiptAccess } from "@/hooks/use-warehouse-receipt-access";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AiOutlineRight } from "react-icons/ai";
import { Plus, X } from "lucide-react";
import useSWR from "swr";
import InfiniteRecordLoadStatus from "@/components/infinite-record-load-status/infinite-record-load-status";
import { useInfiniteRecordList } from "@/hooks/use-infinite-record-list";
import useMobile from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSearchScopePath } from "@/lib/search-utils";
import useSearchStore from "@/store/search.store";
import warehouseReceiptItemsService, {
  WAREHOUSE_RECEIPT_ITEMS_URL,
  type WarehouseReceiptItem,
} from "@/services/warehouse-receipt-items.service";
import ReceiptDetail, {
  formatExpiryDate,
  formatReceiptQuantity,
} from "./receipt-detail";
import ReceiptForm, { receiptError } from "./receipt-form";

const columns = [
  "Mã hàng",
  "Tên hàng",
  "Số lượng",
  "Đơn vị tính",
  "Số lô",
  "Hạn dùng",
  "Quy cách đóng gói",
  "Nhà cung cấp",
  "Nhà sản xuất",
  "Gửi PYCLM",
  "Nhập SAP",
  "Người nhập",
];

function ReceiptStatus({
  done,
  positive,
  negative,
}: {
  done: boolean;
  positive: string;
  negative: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-full ${done ? "bg-green-500" : "bg-red-600"}`}
      />
      {done ? positive : negative}
    </span>
  );
}

function rowValues(receipt: WarehouseReceiptItem) {
  return [
    receipt.item_code,
    receipt.item?.item_name,
    formatReceiptQuantity(receipt.quantity),
    receipt.unit,
    receipt.lot_number,
    formatExpiryDate(receipt.expiry_date),
    receipt.packaging_specification,
    receipt.supplier?.card_name ?? receipt.supplier_name,
    receipt.manufacturer?.manufacturer_name ?? receipt.manufacturer_name,
    <ReceiptStatus
      key="sampling-status"
      done={Boolean(receipt.samplingRequest)}
      positive="Đã gửi"
      negative="Chưa gửi"
    />,
    <ReceiptStatus
      key="sap-status"
      done={Boolean(receipt.sapConfirmation)}
      positive="Đã nhập"
      negative="Chưa nhập"
    />,
    receipt.enteredBy?.name || receipt.enteredBy?.username,
  ];
}

export default function ReceiptPage({
  initialId = null,
}: {
  initialId?: number | null;
}) {
  const isMobile = useMobile();
  const access = useWarehouseReceiptAccess();
  const skeletonRows = useSkeletonRowCount();
  const router = useRouter();
  const pathname = usePathname();
  const scope = getSearchScopePath(pathname);
  const search = useSearchStore((state) => state.searchByPath[scope] ?? "");
  const [requestedId, setSelectedId] = useState(initialId);
  const selectedId = access.canRead ? requestedId : null;
  const [actionsContainer, setActionsContainer] =
    useState<HTMLDivElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const serverSearch = useDebouncedValue(search.trim());
  const {
    records,
    error,
    isLoading,
    mutate,
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
    filters: { search: serverSearch || undefined },
    observe: !isMobile || selectedId === null,
    storageKey: "warehouseReceiptListScroll",
  });
  const data = useMemo(
    () => (access.canRead ? records : []),
    [access.canRead, records],
  );
  const groups = useMemo(() => {
    const result = new Map<string, WarehouseReceiptItem[]>();
    for (const receipt of data ?? []) {
      const date = new Date(receipt.received_at).toLocaleDateString("vi-VN");
      const group = result.get(date) ?? [];
      group.push(receipt);
      result.set(date, group);
    }
    return Array.from(result, ([date, receipts]) => ({ date, receipts }));
  }, [data]);
  const selectedFromList = data.find((receipt) => receipt.id === selectedId);
  const { data: selectedDetail } = useSWR(
    access.canRead && selectedId !== null && !selectedFromList
      ? [`${WAREHOUSE_RECEIPT_ITEMS_URL}/${selectedId}`, access.cacheScope]
      : null,
    () => warehouseReceiptItemsService.read(selectedId!),
  );
  const selected = selectedFromList ?? selectedDetail;
  const title = selected
    ? [selected.item_code, selected.lot_number].join(" - ")
    : `#${selectedId}`;
  function closeDetail() {
    setSelectedId(null);
    if (initialId !== null) router.replace("/home");
  }

  if (access.loading)
    return (
      <p className="p-4 text-sm text-gray-500">Đang tải quyền truy cập...</p>
    );
  if (access.error)
    return (
      <p role="alert" className="p-4 text-sm text-red-600">
        Không thể tải quyền truy cập. Vui lòng thử lại.
      </p>
    );

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow-md">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            <AiOutlineRight />
            <Link href="/home">Kiểm hàng nhập kho</Link>
          </div>
          <Button
            size="sm"
            disabled={isLoading || !access.canRead}
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" /> Thêm
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
      >
        {error && data.length === 0 ? (
          <div
            role="alert"
            className="m-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {receiptError(error, "Không thể tải danh sách hàng nhập kho.")}
          </div>
        ) : (
          <table className="w-full min-w-[1800px] caption-bottom border-t text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow className="hover:bg-transparent">
                {columns.map((label) => (
                  <TableHead
                    key={label}
                    className="border-r px-3 font-bold text-gray-900 last:border-r-0"
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: skeletonRows }, (_, row) => (
                  <TableRow key={row}>
                    {columns.map((label) => (
                      <TableCell key={label} className="border-r">
                        <Skeleton className="h-4 w-full min-w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : groups.length ? (
                groups.map((group) => (
                  <Fragment key={group.date}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell
                        colSpan={columns.length}
                        className="border-r px-3 font-semibold text-gray-900"
                      >
                        <span className="inline-flex items-center gap-2">
                          {group.date}
                          <span
                            className="rounded bg-gray-200 px-1 text-xs font-normal text-gray-700 tabular-nums"
                            aria-label={`${group.receipts.length} bản ghi nhập kho ngày ${group.date}`}
                            title="Số bản ghi nhập kho đang hiển thị trong ngày"
                          >
                            {group.receipts.length}
                          </span>
                        </span>
                      </TableCell>
                    </TableRow>
                    {group.receipts.map((receipt) => (
                      <TableRow
                        key={receipt.id}
                        tabIndex={0}
                        aria-selected={selectedId === receipt.id}
                        data-state={
                          selectedId === receipt.id ? "selected" : undefined
                        }
                        className={`cursor-pointer ${selectedId === receipt.id ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}
                        onClick={() => setSelectedId(receipt.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(receipt.id);
                          }
                        }}
                      >
                        {rowValues(receipt).map((value, index) => (
                          <TableCell
                            key={columns[index]}
                            className="max-w-72 whitespace-pre-wrap break-words border-r px-3 last:border-r-0"
                          >
                            {value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-sm text-gray-500"
                  >
                    {search.trim()
                      ? "Không tìm thấy hàng nhập kho phù hợp."
                      : "Chưa có hàng nhập kho."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        )}
        <InfiniteRecordLoadStatus
          sentinelRef={sentinelRef}
          count={data.length}
          error={error}
          loading={isLoadingMore}
          hasMore={hasMore}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
  const detailPanel = selectedId !== null && (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-20 w-full bg-white p-2">
        <div className="flex w-full flex-wrap justify-between gap-2 border-b border-gray-200 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="shrink-0"
              href="/home"
              onClick={(event) => {
                event.preventDefault();
                closeDetail();
              }}
            >
              Kiểm hàng nhập kho
            </Link>
            <AiOutlineRight className="shrink-0" />
            <p className="truncate">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              ref={setActionsContainer}
              className="flex items-center gap-2"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={closeDetail}
              aria-label="Đóng chi tiết"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 md:p-4">
        <ReceiptDetail
          key={selectedId}
          id={selectedId}
          onClose={closeDetail}
          externalActionsContainer={actionsContainer}
        />
      </div>
    </div>
  );
  return (
    <>
      {isMobile && selectedId !== null ? (
        <div className="h-full overflow-auto">{detailPanel}</div>
      ) : (
        <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
          <ResizablePanelGroup>
            <ResizablePanel
              defaultSize={selectedId !== null ? "55%" : "100%"}
              minSize="35%"
              className="min-h-0 min-w-0 overflow-hidden"
            >
              {listPanel}
            </ResizablePanel>
            {selectedId !== null && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize="45%"
                  minSize="30%"
                  className="min-h-0 min-w-0 overflow-hidden bg-blue-50"
                >
                  {detailPanel}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      )}
      <Dialog
        open={creating && access.canRead}
        onOpenChange={(open) => {
          if (!isSaving) setCreating(open);
        }}
      >
        <DialogContent
          showCloseButton={!isSaving}
          className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]"
        >
          <DialogHeader>
            <DialogTitle className="text-center">
              Thêm hàng nhập kho
            </DialogTitle>
          </DialogHeader>
          <ReceiptForm
            receiptHistory={data}
            onSubmittingChange={setIsSaving}
            onCancel={() => setCreating(false)}
            onSaved={(saved) => {
              setCreating(false);
              setSelectedId(saved.id);
              void mutate();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
