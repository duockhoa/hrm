"use client";

import { Ban, ListPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  PendingCancellationItem,
  PendingProcessItem,
  PostSecondaryPackagingSummary,
} from "../types";
import {
  formatDateTime,
  formatNumber,
  getErrorMessage,
  getPendingCancellationItems,
  getPendingProcessItems,
  getSummaryOrder,
  getSummaryUser,
  getUserLabel,
} from "../utils";
import PendingItemForm from "./pending-item-form";
import PostSecondaryPackagingSummaryForm from "./post-secondary-packaging-summary-form";

type PendingKind = "process" | "cancellation";
type PendingRecord = PendingProcessItem | PendingCancellationItem;

const toQuantity = (value: string | number | null | undefined) => {
  const quantity = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(quantity) ? quantity : 0;
};

function RowActions({
  item,
  onEdit,
  onDelete,
}: {
  item?: PendingRecord;
  onEdit: (item: PendingRecord) => void;
  onDelete: (item: PendingRecord) => void;
}) {
  if (!item) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="Sửa"
        onClick={() => onEdit(item)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        title="Xóa"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => onDelete(item)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function PendingItemsSection({
  kind,
  items,
  onEdit,
  onDelete,
}: {
  kind: PendingKind;
  items: PendingRecord[];
  onEdit: (item: PendingRecord) => void;
  onDelete: (item: PendingRecord) => void;
}) {
  const isProcess = kind === "process";
  const title = isProcess ? "Chờ xử lý" : "Chờ hủy";

  return (
    <section className="overflow-hidden rounded border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <h2 className="text-left text-lg font-semibold text-gray-800">
          {title}
        </h2>
        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-sm font-semibold text-gray-700">
          {items.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28 text-right">Số lượng</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Phương án</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  Chưa có dữ liệu.
                </TableCell>
              </TableRow>
            ) : (
              items.map((rawItem, index) => {
                const item = rawItem as PendingProcessItem &
                  PendingCancellationItem;
                return (
                  <TableRow key={item.id ?? index}>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNumber(
                        isProcess
                          ? item.pending_quantity
                          : item.cancellation_quantity,
                      )}
                    </TableCell>
                    <TableCell className="min-w-52 whitespace-normal break-words">
                      {(isProcess
                        ? item.pending_reason
                        : item.cancellation_reason) ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-52 whitespace-normal break-words">
                      {(isProcess
                        ? item.processing_plan
                        : item.cancellation_plan) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        item={item}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default function PostSecondaryPackagingSummaryDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDialog, setPendingDialog] = useState<{
    kind: PendingKind;
    item?: PendingRecord;
  } | null>(null);
  const [deletePending, setDeletePending] = useState<{
    kind: PendingKind;
    item: PendingRecord;
  } | null>(null);
  const [isDeletingSummary, setIsDeletingSummary] = useState(false);
  const [isSummaryDeleteOpen, setIsSummaryDeleteOpen] = useState(false);
  const [isDeletingPending, setIsDeletingPending] = useState(false);
  const detailKey =
    API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(id);
  const { data, error } = useSWR<PostSecondaryPackagingSummary>(detailKey, () =>
    productionOrdersService.fetchPostSecondaryPackagingSummaryById(id),
  );
  const parentOrderId = data?.production_order_id;
  const listKey = parentOrderId
    ? API_ROUTES.productionOrders.postSecondaryPackagingSummaries(parentOrderId)
    : null;
  const { data: summaryList = [] } = useSWR<PostSecondaryPackagingSummary[]>(
    listKey,
    () =>
      productionOrdersService.fetchPostSecondaryPackagingSummaries(
        parentOrderId ?? "",
      ),
  );
  const usedSemiFinishedOrderIds = summaryList
    .map((summary) => summary.semi_finished_product_order_id)
    .filter((orderId): orderId is string | number =>
      orderId !== null && orderId !== undefined
    );

  const deleteSummary = async () => {
    try {
      setIsDeletingSummary(true);
      await productionOrdersService.deletePostSecondaryPackagingSummary(id);
      if (listKey) await mutate(listKey);
      toast.success("Đã xóa tổng kết và các dòng liên quan.");
      onClose();
    } catch (deleteError) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa tổng kết BTP hoàn thiện."),
      );
    } finally {
      setIsDeletingSummary(false);
    }
  };

  const deletePendingItem = async () => {
    if (!deletePending?.item.id) return;
    try {
      setIsDeletingPending(true);
      if (deletePending.kind === "process") {
        await productionOrdersService.deletePostSecondaryPackagingPendingProcessItem(
          deletePending.item.id,
        );
      } else {
        await productionOrdersService.deletePostSecondaryPackagingPendingCancellationItem(
          deletePending.item.id,
        );
      }
      await mutate(detailKey);
      if (listKey) await mutate(listKey);
      toast.success(
        `Đã xóa dòng ${deletePending.kind === "process" ? "chờ xử lý" : "chờ hủy"}.`,
      );
      setDeletePending(null);
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa dòng dữ liệu."));
    } finally {
      setIsDeletingPending(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded-lg border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Tổng kết BTP hoàn thiện" onClose={onClose} />
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Không tìm thấy tổng kết BTP hoàn thiện.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-4xl space-y-3 rounded-lg border bg-white p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const processItems = getPendingProcessItems(data);
  const cancellationItems = getPendingCancellationItems(data);
  const totalProcessQuantity = processItems.reduce(
    (total, item) => total + toQuantity(item.pending_quantity),
    0,
  );
  const totalCancellationQuantity = cancellationItems.reduce(
    (total, item) => total + toQuantity(item.cancellation_quantity),
    0,
  );
  const semiFinishedOrder = getSummaryOrder(data);
  const semiFinishedProductName =
    semiFinishedOrder?.item?.item_name ?? semiFinishedOrder?.description ?? "—";
  const semiFinishedLotNo = semiFinishedOrder?.lot_no ?? "—";
  const semiFinishedProductCode =
    semiFinishedOrder?.item?.item_code ?? semiFinishedOrder?.item_code ?? "—";
  const semiFinishedOrderCode =
    semiFinishedOrder?.production_order_code ?? semiFinishedOrder?.id ?? "—";

  return (
    <div className="w-full max-w-4xl rounded-lg border bg-white p-4 shadow-md">
      <DetailPanelHeader
        title={`Tổng kết BTP hoàn thiện #${data.id}`}
        onClose={onClose}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setIsSummaryDeleteOpen(true)}
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
      />

      <div className="border-b py-3">
        <div className="flex flex-wrap justify-start gap-2">
          <div className="inline-flex flex-col items-center p-0.5 md:p-1">
            <button
              type="button"
              title="Nhập xử lý"
              aria-label="Nhập thông tin chờ xử lý"
              className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              onClick={() => setPendingDialog({ kind: "process" })}
            >
              <ListPlus className="size-4" />
            </button>
            <div className="w-[82px] md:w-[90px]">
              <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                Nhập xử lý
              </p>
            </div>
          </div>

          <div className="inline-flex flex-col items-center p-0.5 md:p-1">
            <button
              type="button"
              title="Nhập hủy"
              aria-label="Nhập thông tin chờ hủy"
              className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-white hover:bg-blue-600 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
              onClick={() => setPendingDialog({ kind: "cancellation" })}
            >
              <Ban className="size-4" />
            </button>
            <div className="w-[82px] md:w-[90px]">
              <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                Nhập hủy
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 text-center">
        <FieldDisplay
          lable="Lô BTP"
          value={`${semiFinishedProductName} - ${semiFinishedLotNo}`}
        />
        <FieldDisplay
          lable="Mã lệnh sản xuất BTP"
          value={String(semiFinishedOrderCode)}
        />
        <FieldDisplay
          lable="Mã thành phẩm"
          value={String(semiFinishedProductCode)}
        />
        <FieldDisplay
          lable="Số tải nhận"
          value={formatNumber(data.received_bag_count)}
        />
        <FieldDisplay
          lable="Số lượng tồn"
          value={formatNumber(data.remaining_quantity)}
        />
        <FieldDisplay lable="Đơn vị tính" value={data.unit || "—"} />
        <FieldDisplay
          lable="Số lượng xử lý"
          value={formatNumber(totalProcessQuantity)}
        />
        <FieldDisplay
          lable="Số lượng hủy"
          value={formatNumber(totalCancellationQuantity)}
        />
        <FieldDisplay lable="Lý do tồn" value={data.remaining_reason || "—"} />
        <FieldDisplay
          lable="Người nhập"
          value={getUserLabel(getSummaryUser(data))}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
      </div>

      <div className="mt-5 space-y-4">
        <PendingItemsSection
          kind="process"
          items={processItems}
          onEdit={(item) => setPendingDialog({ kind: "process", item })}
          onDelete={(item) => setDeletePending({ kind: "process", item })}
        />
        <PendingItemsSection
          kind="cancellation"
          items={cancellationItems}
          onEdit={(item) => setPendingDialog({ kind: "cancellation", item })}
          onDelete={(item) => setDeletePending({ kind: "cancellation", item })}
        />
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Cập nhật tổng kết</DialogTitle>
          </DialogHeader>
          <PostSecondaryPackagingSummaryForm
            productionOrderId={parentOrderId ?? ""}
            data={data}
            usedSemiFinishedOrderIds={usedSemiFinishedOrderIds}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDialog !== null}
        onOpenChange={(open) => !open && setPendingDialog(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {pendingDialog?.item
                ? `Cập nhật ${pendingDialog.kind === "process" ? "chờ xử lý" : "chờ hủy"}`
                : pendingDialog?.kind === "process"
                  ? "Nhập xử lý"
                  : "Nhập hủy"}
            </DialogTitle>
          </DialogHeader>
          {pendingDialog ? (
            <PendingItemForm
              kind={pendingDialog.kind}
              summaryId={id}
              data={pendingDialog.item}
              onCancel={() => setPendingDialog(null)}
              onSaved={async () => {
                setPendingDialog(null);
                if (listKey) await mutate(listKey);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletePending !== null}
        onOpenChange={(open) => !open && setDeletePending(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa dòng</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dữ liệu sau khi xóa không thể khôi phục.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletePending(null)}
              disabled={isDeletingPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deletePendingItem()}
              disabled={isDeletingPending}
            >
              {isDeletingPending ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSummaryDeleteOpen} onOpenChange={setIsSummaryDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa tổng kết BTP hoàn thiện?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Các dòng chờ xử lý và chờ hủy thuộc bản tổng kết này cũng sẽ bị xóa.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSummaryDeleteOpen(false)}
              disabled={isDeletingSummary}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteSummary()}
              disabled={isDeletingSummary}
            >
              {isDeletingSummary ? "Đang xóa..." : "Xóa tổng kết"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
