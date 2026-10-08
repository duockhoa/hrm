"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import useSWR, { useSWRConfig } from "swr";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import warehouseReceiptItemsService, {
  WAREHOUSE_RECEIPT_ITEMS_URL,
  type WarehouseReceiptItem,
} from "@/services/warehouse-receipt-items.service";
import ReceiptForm, { receiptError } from "./receipt-form";

export const formatReceiptDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN");
export const formatExpiryDate = (value: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "";
export const formatReceiptQuantity = (value: string | number | null) =>
  value == null
    ? ""
    : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 });

export default function ReceiptDetail({
  id,
  onClose,
  externalActionsContainer,
}: {
  id: number;
  onClose: () => void;
  externalActionsContainer: HTMLDivElement | null;
}) {
  const { data, error, mutate } = useSWR(
    `${WAREHOUSE_RECEIPT_ITEMS_URL}/${id}`,
    () => warehouseReceiptItemsService.read(id),
  );
  const { mutate: mutateGlobal } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await warehouseReceiptItemsService.delete(id);
      toast.success("Đã xóa hàng nhập kho.");
      await mutateGlobal(
        WAREHOUSE_RECEIPT_ITEMS_URL,
        (list: WarehouseReceiptItem[] | undefined) =>
          (list ?? []).filter((entry) => entry.id !== id),
        { revalidate: true },
      );
      onClose();
    } catch (error) {
      setDeleteError(receiptError(error, "Không thể xóa hàng nhập kho."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (error)
    return (
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {receiptError(error, "Không thể tải chi tiết hàng nhập kho.")}
      </div>
    );
  if (!data)
    return (
      <div className="space-y-4 rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );

  const actions = (
    <>
      <Button size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Sửa
      </Button>
      <Button
        size="sm"
        disabled={isDeleting}
        onClick={() => {
          setDeleteError("");
          setDeleting(true);
        }}
        className="bg-black text-white hover:bg-gray-800"
      >
        <Trash2 className="size-4" /> Xóa
      </Button>
    </>
  );
  const fields = [
    ["Mã hàng", data.item_code],
    ["Tên hàng", data.item?.item_name],
    ["Số lượng", formatReceiptQuantity(data.quantity)],
    ["Đơn vị tính", data.unit],
    ["Số lô", data.lot_number],
    ["Số lô nhà sản xuất", data.manufacturer_lot_number],
    ["Hạn dùng", formatExpiryDate(data.expiry_date)],
    ["Quy cách đóng gói", data.packaging_specification],
    [
      "Nhà cung cấp",
      data.supplier
        ? `${data.supplier.card_name} (${data.supplier.card_code})`
        : data.supplier_name,
    ],
    ["Nhà sản xuất", data.manufacturer_name],
    ["Ghi chú", data.note],
    ["Thời điểm nhập", formatReceiptDateTime(data.received_at)],
    ["Người nhập", data.enteredBy?.name || data.enteredBy?.username],
    ["Ngày tạo", formatReceiptDateTime(data.created_at)],
    ["Ngày cập nhật", formatReceiptDateTime(data.updated_at)],
  ];
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      {externalActionsContainer &&
        createPortal(actions, externalActionsContainer)}
      <DetailPanelHeader
        title={`Kiểm hàng nhập kho #${data.id}`}
        subtitle={formatReceiptDateTime(data.received_at)}
        onClose={onClose}
        showCloseButton={false}
      />
      <div className="mt-4 flex flex-col gap-4 text-left [&_p]:whitespace-pre-wrap">
        {fields.map(([label, value]) => (
          <FieldDisplay key={label} lable={label ?? ""} value={value ?? ""} />
        ))}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Sửa hàng nhập kho</DialogTitle>
          </DialogHeader>
          <ReceiptForm
            data={data}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              void mutate(saved, { revalidate: false });
              void mutateGlobal(WAREHOUSE_RECEIPT_ITEMS_URL);
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleting(open);
        }}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hàng nhập kho</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa bản ghi hàng nhập kho #{data.id} không?
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleting(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
