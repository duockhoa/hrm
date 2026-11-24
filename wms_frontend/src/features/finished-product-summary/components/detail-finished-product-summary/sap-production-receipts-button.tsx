"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft, ChevronRight, PackagePlus } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatExpiryDate,
  formatReceiptQuantity,
} from "@/features/warehouse-receipt-items/receipt-formatters";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService, {
  type SapProductionReceipt,
} from "@/services/product-orders.service";
import useUserStore from "@/store/user.store";

const priceFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 6,
});

function SapProductionReceiptDetail({
  receipt,
}: {
  receipt: SapProductionReceipt;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Ngày nhập</dt>
          <dd className="font-medium">
            {formatExpiryDate(receipt.DocDate) || "—"}
          </dd>
        </div>
        {receipt.Reference2 && (
          <div>
            <dt className="text-muted-foreground">Tham chiếu 2</dt>
            <dd className="font-medium">{receipt.Reference2}</dd>
          </div>
        )}
        {receipt.JournalMemo && (
          <div>
            <dt className="text-muted-foreground">Ghi chú nhật ký</dt>
            <dd>{receipt.JournalMemo}</dd>
          </div>
        )}
        {receipt.Comments && (
          <div className="col-span-full">
            <dt className="text-muted-foreground">Ghi chú</dt>
            <dd className="whitespace-pre-wrap break-words">
              {receipt.Comments}
            </dd>
          </div>
        )}
      </dl>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hàng</TableHead>
              <TableHead>Tên hàng</TableHead>
              <TableHead>Kho</TableHead>
              <TableHead>Phòng ban - Bộ phận</TableHead>
              <TableHead>Khoản mục chi phí</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead>Đơn vị tính</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead>Số lô</TableHead>
              <TableHead>Ngày sản xuất</TableHead>
              <TableHead>Hạn dùng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipt.DocumentLines.map((line) => (
              <TableRow key={line.LineNum}>
                <TableCell className="font-medium">{line.ItemCode}</TableCell>
                <TableCell className="min-w-44 whitespace-normal">
                  {line.ItemDescription || "—"}
                </TableCell>
                <TableCell>{line.WarehouseCode || "—"}</TableCell>
                <TableCell>{line.CostingCode || "—"}</TableCell>
                <TableCell>{line.CostingCode2 || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatReceiptQuantity(line.Quantity) || "—"}
                </TableCell>
                <TableCell>{line.MeasureUnit || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.Price == null
                    ? "—"
                    : [priceFormatter.format(line.Price), line.Currency]
                        .filter(Boolean)
                        .join(" ")}
                </TableCell>
                <TableCell>{line.U_SL || "—"}</TableCell>
                <TableCell>{formatExpiryDate(line.U_NSX) || "—"}</TableCell>
                <TableCell>{formatExpiryDate(line.U_HSD) || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function SapProductionReceiptsButton({
  summaryId,
  orderCode,
}: {
  summaryId: number | string;
  orderCode: number | string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const userId = useUserStore((state) => state.user?.id);
  const { data, error, isValidating, mutate } = useSWR(
    open && userId != null
      ? [
          API_ROUTES.productionOrders.finishedProductSummarySapReceipts(
            summaryId,
          ),
          userId,
        ]
      : null,
    () => productionOrdersService.fetchSapProductionReceipts(summaryId),
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const selected = data?.find((receipt) => receipt.DocEntry === selectedId);
  const notFound = isAxiosError(error) && error.response?.status === 404;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSelectedId(null);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group inline-flex cursor-pointer flex-col items-center rounded-md p-0.5 focus-visible:outline-2 focus-visible:outline-blue-600 md:p-1"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white group-hover:bg-blue-600 md:h-10 md:w-10">
            <PackagePlus aria-hidden="true" className="size-5" />
          </span>
          <span className="mt-1 w-[68px] text-center text-xs font-semibold leading-tight text-gray-700 md:w-[90px] md:text-sm">
            Xem PNK Sản xuất
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>
            {selected && !error
              ? `Phiếu nhập kho sản xuất SAP #${selected.DocNum}`
              : "Phiếu nhập kho sản xuất SAP"}
          </DialogTitle>
          <DialogDescription>Lệnh sản xuất {orderCode}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-dashed p-4 text-sm"
          >
            <p>
              {notFound
                ? "Không tìm thấy lệnh sản xuất tương ứng trên SAP."
                : "Không thể tải phiếu nhập kho sản xuất từ SAP."}
            </p>
            {!notFound && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={isValidating}
                onClick={() => void mutate().catch(() => {})}
              >
                Thử lại
              </Button>
            )}
          </div>
        ) : !data ? (
          <p role="status" className="py-5 text-sm text-muted-foreground">
            Đang tải phiếu nhập kho từ SAP…
          </p>
        ) : selected ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft aria-hidden="true" /> Về danh sách phiếu
            </Button>
            <div className="min-h-0 overflow-y-auto">
              <SapProductionReceiptDetail receipt={selected} />
            </div>
          </>
        ) : data.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Lệnh sản xuất này chưa có phiếu nhập kho trên SAP.
          </p>
        ) : (
          <ul className="min-h-0 divide-y overflow-y-auto rounded-md border">
            {data.map((receipt) => (
              <li key={receipt.DocEntry}>
                <button
                  type="button"
                  onClick={() => setSelectedId(receipt.DocEntry)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      Phiếu #{receipt.DocNum}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatExpiryDate(receipt.DocDate)} ·{" "}
                      {receipt.DocumentLines.length} dòng hàng
                    </span>
                    {receipt.Comments && (
                      <span className="mt-1 block truncate text-sm">
                        {receipt.Comments}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
