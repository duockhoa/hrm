"use client";

import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import { useWarehouseReceiptAccess } from "@/hooks/use-warehouse-receipt-access";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import useSWR, { useSWRConfig } from "swr";
import {
  Check,
  FilePenLine,
  Loader2,
  Pencil,
  Tags,
  Trash2,
} from "lucide-react";
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
import { RECEIPT_ATTACHMENT_GROUPS } from "./receipt-attachments";
import { ReceiptImageGallery } from "./receipt-image-picker";
import ReceiptSamplingDraftForm from "./receipt-sampling-draft-form";
import {
  formatExpiryDate,
  formatReceiptDateTime,
  formatReceiptQuantity,
} from "./receipt-formatters";

export {
  formatExpiryDate,
  formatReceiptDateTime,
  formatReceiptQuantity,
} from "./receipt-formatters";

export default function ReceiptDetail({
  id,
  onClose,
  externalActionsContainer,
}: {
  id: number;
  onClose: () => void;
  externalActionsContainer: HTMLDivElement | null;
}) {
  const access = useWarehouseReceiptAccess();
  const { data, error, mutate } = useSWR(
    access.canRead
      ? [`${WAREHOUSE_RECEIPT_ITEMS_URL}/${id}`, access.cacheScope]
      : null,
    () => warehouseReceiptItemsService.read(id),
  );
  const { mutate: mutateGlobal } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [sapSaving, setSapSaving] = useState(false);
  const [sapError, setSapError] = useState("");
  const [labelSaving, setLabelSaving] = useState(false);
  const [labelError, setLabelError] = useState("");

  async function handleCreateLabel() {
    if (labelSaving) return;
    setLabelSaving(true);
    setLabelError("");
    try {
      const result =
        await warehouseReceiptItemsService.createQuarantineLabel(id);
      toast.success(
        `Đã điền thông tin nhãn biệt trữ vào sheet ${result.user_name}.`,
      );
    } catch (error) {
      setLabelError(receiptError(error, "Không thể tạo nhãn biệt trữ."));
    } finally {
      setLabelSaving(false);
    }
  }

  async function handleConfirmSap() {
    if (sapSaving || data?.sapConfirmation) return;
    setSapSaving(true);
    setSapError("");
    try {
      const confirmation = await warehouseReceiptItemsService.confirmSap(id);
      await mutate(
        (current) =>
          current ? { ...current, sapConfirmation: confirmation } : current,
        { revalidate: false },
      );
      void refreshItemCatalog(WAREHOUSE_RECEIPT_ITEMS_URL).catch(() => {});
      toast.success("Đã xác nhận nhập SAP.");
    } catch (error) {
      setSapError(
        receiptError(
          error,
          "Không thể xác nhận đã nhập SAP. Vui lòng thử lại.",
        ),
      );
    } finally {
      setSapSaving(false);
    }
  }

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
      await refreshItemCatalog(WAREHOUSE_RECEIPT_ITEMS_URL);
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
        className="mx-auto w-full max-w-4xl rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {receiptError(error, "Không thể tải chi tiết hàng nhập kho.")}
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 rounded border bg-white p-4 shadow-md">
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
  const fields: [string, ReactNode][] = [
    [
      "Mã hàng",
      <Link
        key="item-code"
        href={`/items/${encodeURIComponent(data.item_code)}`}
        className="text-blue-600 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {data.item_code}
      </Link>,
    ],
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
    [
      "Nhà sản xuất",
      data.manufacturer
        ? `${data.manufacturer.manufacturer_name} (${data.manufacturer.manufacturer_code})`
        : data.manufacturer_name,
    ],
    ["Ghi chú", data.note],
    ["Thời điểm nhập", formatReceiptDateTime(data.received_at)],
    ["Người nhập", data.enteredBy?.name || data.enteredBy?.username],
    ["Trạng thái SAP", data.sapConfirmation ? "Đã nhập SAP" : "Chưa nhập SAP"],
    ...(data.sapConfirmation
      ? ([
          [
            "Người xác nhận SAP",
            data.sapConfirmation.confirmedBy?.name ||
              data.sapConfirmation.confirmedBy?.username ||
              "Tài khoản đã xóa",
          ],
          [
            "Thời điểm xác nhận SAP",
            formatReceiptDateTime(data.sapConfirmation.confirmed_at),
          ],
        ] as [string, ReactNode][])
      : []),
  ];
  return (
    <div className="mx-auto w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      {externalActionsContainer &&
        createPortal(actions, externalActionsContainer)}
      <DetailPanelHeader
        title={`Kiểm hàng nhập kho #${data.id}`}
        subtitle={formatReceiptDateTime(data.received_at)}
        onClose={onClose}
        showCloseButton={false}
      />
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-gray-200 py-3">
        <button
          type="button"
          onClick={() => setDraftOpen(true)}
          className="inline-flex cursor-pointer flex-col items-center p-0.5 md:p-1"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 md:h-10 md:w-10">
            <FilePenLine className="size-5" />
          </span>
          <span className="mt-1 w-[90px] text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
            Soạn PYCLM
          </span>
        </button>
        <button
          type="button"
          onClick={() => void handleCreateLabel()}
          disabled={labelSaving}
          className="inline-flex cursor-pointer flex-col items-center p-0.5 disabled:cursor-wait disabled:opacity-60 md:p-1"
          aria-label="Tạo Nhãn BT"
          aria-busy={labelSaving}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 md:h-10 md:w-10">
            {labelSaving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Tags className="size-5" />
            )}
          </span>
          <span className="mt-1 w-[68px] text-center text-[12px] font-semibold leading-tight text-gray-700 md:w-[90px] md:text-[14px]">
            {labelSaving ? "Đang tạo..." : "Tạo Nhãn BT"}
          </span>
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={Boolean(data.sapConfirmation)}
          aria-label="nhập SAP"
          disabled={sapSaving || Boolean(data.sapConfirmation)}
          onClick={() => void handleConfirmSap()}
          className="inline-flex cursor-pointer flex-col items-center p-0.5 disabled:cursor-default md:p-1"
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full text-white md:h-10 md:w-10 ${data.sapConfirmation ? "bg-green-600" : "bg-blue-500 hover:bg-blue-600"}`}
          >
            {sapSaving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Check className="size-5" />
            )}
          </span>
          <span className="mt-1 w-[90px] text-center text-[12px] font-semibold leading-tight text-gray-700 md:text-[14px]">
            {sapSaving ? "Đang lưu..." : "nhập SAP"}
          </span>
        </button>
      </div>
      {sapError && (
        <p role="alert" className="mt-3 text-left text-sm text-red-600">
          {sapError}
        </p>
      )}
      {labelError && (
        <p role="alert" className="mt-3 text-left text-sm text-red-600">
          {labelError}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-4 text-left [&_p]:whitespace-pre-wrap">
        {fields.map(([label, value]) => (
          <FieldDisplay key={label} lable={label ?? ""} value={value ?? ""} />
        ))}
        {RECEIPT_ATTACHMENT_GROUPS.map(({ type, label }) => {
          const images = (data.attachments ?? []).filter(
            (image) => image.attachment_type === type,
          );
          return images.length ? (
            <div key={type} className="space-y-2">
              <p className="text-sm font-medium">
                {label} ({images.length})
              </p>
              <ReceiptImageGallery images={images} />
            </div>
          ) : null;
        })}
      </div>
      <Dialog
        open={draftOpen}
        onOpenChange={(open) => {
          if (!draftSaving) setDraftOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={!draftSaving}
          className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]"
        >
          <DialogHeader>
            <DialogTitle>Soạn phiếu yêu cầu lấy mẫu</DialogTitle>
          </DialogHeader>
          <ReceiptSamplingDraftForm
            receipt={data}
            onSubmittingChange={setDraftSaving}
            onCancel={() => setDraftOpen(false)}
            onSaved={() => setDraftOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={editing}
        onOpenChange={(open) => {
          if (!isSaving) setEditing(open);
        }}
      >
        <DialogContent
          showCloseButton={!isSaving}
          className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]"
        >
          <DialogHeader>
            <DialogTitle>Sửa hàng nhập kho</DialogTitle>
          </DialogHeader>
          <ReceiptForm
            onSubmittingChange={setIsSaving}
            data={data}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              void mutate(saved, { revalidate: false });
              void mutateGlobal(WAREHOUSE_RECEIPT_ITEMS_URL);
              void refreshItemCatalog(WAREHOUSE_RECEIPT_ITEMS_URL);
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
