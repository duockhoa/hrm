"use client";

import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowLeft,
  EllipsisVertical,
  Edit2,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrderWeighingRecordsService from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecord,
  WeighingRecordPerson,
  WeighingProductionOrder,
} from "../types";

import ProductionOrderWeighingRecordDetail from "./production-order-weighing-record-detail";
import { weighingRecordStatusLabel } from "../record-status";

const personLabel = (person?: WeighingRecordPerson | null) =>
  person?.name || person?.username || "—";
const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
};
const errorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join("; ");
  }
  return fallback;
};

export default function InlineProductionOrderWeighingRecord({
  productionOrder,
  onClose,
  embedded = false,
  onSelectRecord,
}: {
  productionOrder: WeighingProductionOrder;
  onClose?: () => void;
  embedded?: boolean;
  onSelectRecord?: (record: ProductionOrderWeighingRecord) => void;
}) {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [editingRecord, setEditingRecord] =
    useState<ProductionOrderWeighingRecord | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [editError, setEditError] = useState("");
  const editBusyRef = useRef(false);
  const productionOrderId =
    productionOrder?.id ??
    productionOrder?.production_order_id ??
    productionOrder?.DocumentAbsoluteEntry;
  const itemCode =
    productionOrder?.item_code ?? productionOrder?.item?.item_code ?? "";
  const itemName =
    productionOrder?.item?.item_name ?? productionOrder?.item_name ?? "";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] =
    useState<ProductionOrderWeighingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false);
  const recordsKey =
    productionOrderId != null
      ? API_ROUTES.productionOrders.weighingRecords(productionOrderId)
      : null;
  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(recordsKey, () =>
    productionOrderWeighingRecordsService.fetchAllByProductionOrderId(
      productionOrderId!,
    ),
  );
  const selectedRecord = records?.find((record) => record.id === selectedId);
  const currentEditingRecord =
    records?.find((record) => record.id === editingRecord?.id) ?? editingRecord;
  const editLocked =
    currentEditingRecord?.status === "approved" ||
    Boolean(currentEditingRecord?.ipc_staff_approved_at);

  const saveDescription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRecord || editBusyRef.current || editLocked) return;
    editBusyRef.current = true;
    setIsSavingDescription(true);
    setEditError("");
    try {
      const updated =
        await productionOrderWeighingRecordsService.updateDescription(
          editingRecord.id,
          editDescription.trim() || null,
        );
      await mutate(
        (current) =>
          current?.map((record) =>
            record.id === updated.id ? updated : record,
          ),
        { revalidate: false },
      );
      await mutateGlobal(
        API_ROUTES.productionOrders.weighingRecordDetail(updated.id),
        updated,
        { revalidate: false },
      );
      setEditingRecord(null);
      toast.success("Đã cập nhật mô tả phiếu cân.");
      void mutate().catch(() => undefined);
    } catch (error) {
      setEditError(errorMessage(error, "Không thể sửa mô tả phiếu cân."));
      void mutate().catch(() => undefined);
    } finally {
      editBusyRef.current = false;
      setIsSavingDescription(false);
    }
  };

  const createRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || productionOrderId == null) return;
    setIsSubmitting(true);
    try {
      const created = await productionOrderWeighingRecordsService.create(
        productionOrderId,
        {
          description: description.trim() || null,
        },
      );
      // Update the list immediately; a refresh failure must not suggest creation failed.
      await mutate((current) => [created, ...(current ?? [])], {
        revalidate: false,
      });
      setIsCreateOpen(false);
      toast.success("Đã tạo phiếu cân.");
      void mutate().catch(() => undefined);
    } catch (createError) {
      toast.error(errorMessage(createError, "Không thể tạo phiếu cân."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async () => {
    if (!deletingRecord || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await productionOrderWeighingRecordsService.delete(deletingRecord.id);
      await mutate(
        (current) =>
          current?.filter((record) => record.id !== deletingRecord.id),
        { revalidate: false },
      );
      setDeletingRecord(null);
      toast.success("Đã xóa phiếu cân.");
      void mutate().catch(() => undefined);
    } catch (error) {
      const text = errorMessage(error, "Không thể xóa phiếu cân.");
      setDeleteError(text);
      toast.error(text);
      void mutate().catch(() => undefined);
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  if (selectedRecord) {
    return (
      <ProductionOrderWeighingRecordDetail
        record={selectedRecord}
        productionOrder={productionOrder}
        onClose={() => setSelectedId(null)}
      />
    );
  }

  return (
    <>
      <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            {!embedded && onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 shrink-0"
                onClick={onClose}
                title="Quay lại chi tiết lệnh sản xuất"
                aria-label="Quay lại chi tiết lệnh sản xuất"
              >
                <ArrowLeft className="size-5" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2
                  className={
                    embedded
                      ? "text-lg font-semibold"
                      : "text-2xl font-bold leading-tight text-blue-500 md:text-3xl"
                  }
                >
                  Phiếu cân
                </h2>
                {embedded && records ? (
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700">
                    {records.length}
                  </span>
                ) : null}
              </div>
              {!embedded ? (
                <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
                  {itemCode}
                  {itemName ? ` - ${itemName}` : ""}
                  {productionOrder?.lot_no
                    ? ` - Lô ${productionOrder.lot_no}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
          {!embedded && productionOrderId != null && !isLoading && !error ? (
            <Button
              type="button"
              className="shrink-0 self-end bg-slate-900 text-white hover:bg-slate-800 sm:self-auto"
              onClick={() => {
                setDescription("");
                setIsCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              Thêm phiếu cân
            </Button>
          ) : null}
        </div>

        {productionOrderId == null ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Không xác định được lệnh sản xuất.
          </p>
        ) : isLoading ? (
          <div
            className="flex min-h-40 items-center justify-center"
            role="status"
            aria-label="Đang tải phiếu cân"
          >
            <Loader2 className="size-7 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{errorMessage(error, "Không thể tải phiếu cân.")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => void mutate().catch(() => undefined)}
            >
              Thử lại
            </Button>
          </div>
        ) : records?.length ? (
          <div className="mt-4 divide-y border-y">
            {records.map((record) => (
              <div
                key={record.id}
                className="group flex items-stretch transition-colors hover:bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectRecord
                      ? onSelectRecord(record)
                      : setSelectedId(record.id)
                  }
                  className="flex min-w-0 flex-1 items-start justify-between gap-4 px-3 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-slate-700" />
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {record.description || "Phiếu cân của lệnh sản xuất"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Tạo lúc {formatDate(record.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-medium text-slate-800">
                      {weighingRecordStatusLabel(record)}
                    </p>
                    <p className="mt-1 text-orange-600">
                      {personLabel(record.createdBy)}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center pr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-700"
                        aria-label="Thao tác phiếu cân"
                        title="Thao tác phiếu cân"
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={
                          record.status === "approved" ||
                          Boolean(record.ipc_staff_approved_at)
                        }
                        onSelect={() => {
                          setEditingRecord(record);
                          setEditDescription(record.description ?? "");
                          setEditError("");
                        }}
                      >
                        <Edit2 className="size-4" />
                        Sửa mô tả
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={
                          record.status === "approved" ||
                          Boolean(record.ipc_staff_approved_at)
                        }
                        onSelect={() => {
                          setDeleteError("");
                          setDeletingRecord(record);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : embedded ? (
          <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
            chưa có dữ liệu
          </div>
        ) : (
          <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded border border-dashed px-4 text-center">
            <FileText className="size-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">
              Lệnh sản xuất chưa có phiếu cân
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Chọn Thêm phiếu cân để tạo phiếu cho lệnh sản xuất này.
            </p>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(editingRecord)}
        onOpenChange={(open) => {
          if (!open && !editBusyRef.current) setEditingRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa mô tả phiếu cân</DialogTitle>
            <DialogDescription>
              Cập nhật mô tả phiếu cân của lệnh sản xuất này.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDescription} className="flex flex-col gap-4">
            <label
              htmlFor="weighing-record-edit-description"
              className="text-sm font-medium"
            >
              Mô tả
            </label>
            <Textarea
              id="weighing-record-edit-description"
              value={editDescription}
              rows={4}
              disabled={isSavingDescription || editLocked}
              onChange={(event) => setEditDescription(event.target.value)}
            />
            {editError ? (
              <p role="alert" className="text-sm text-red-600">
                {editError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSavingDescription}
                onClick={() => setEditingRecord(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSavingDescription || editLocked}
              >
                {isSavingDescription ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Edit2 className="size-4" />
                )}
                {isSavingDescription ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingRecord)}
        onOpenChange={(open) => {
          if (!open && !deletingRef.current) {
            setDeletingRecord(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa phiếu cân</DialogTitle>
            <DialogDescription>
              Phiếu cân và toàn bộ danh sách nguyên liệu trong phiếu sẽ bị xóa.
              Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Phiếu cân</p>
            <p className="mt-1 break-words text-slate-600">
              {deletingRecord?.description || "Phiếu cân của lệnh sản xuất"}
            </p>
          </div>
          {deleteError ? (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setDeletingRecord(null);
                setDeleteError("");
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteRecord()}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa phiếu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setIsCreateOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm phiếu cân</DialogTitle>
            <DialogDescription>
              Tạo phiếu cân cho {itemCode}
              {itemName ? ` - ${itemName}` : ""}
              {productionOrder?.lot_no ? `, lô ${productionOrder.lot_no}` : ""}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createRecord} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="weighing-record-description"
                className="text-sm font-medium text-slate-800"
              >
                Mô tả
              </label>
              <Textarea
                id="weighing-record-description"
                value={description}
                disabled={isSubmitting}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nhập mô tả phiếu cân"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isSubmitting ? "Đang tạo..." : "Tạo phiếu cân"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
