"use client";

import * as React from "react";
import { Camera, Check, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderAttachment } from "../types";
import {
  ATTACHMENT_TYPE_OPTIONS,
  formatApprovalStatus,
  formatAttachmentType,
  formatDateTime,
  getFileName,
  getUserLabel,
  validateAttachmentFiles,
} from "../utils";
import AttachmentImage from "./attachment-image";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getStatusClassName = (status?: string | null) => {
  if (status === "approved") return "border-green-200 bg-green-50 text-green-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
};

function EditAttachmentForm({
  attachment,
  onSaved,
  onClose,
}: {
  attachment: ProductionOrderAttachment;
  onSaved: () => Promise<void>;
  onClose?: () => void;
}) {
  const [attachmentType, setAttachmentType] = React.useState(
    attachment.attachment_type ?? "production",
  );
  const [description, setDescription] = React.useState(
    attachment.description ?? "",
  );
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileIdsToDelete, setFileIdsToDelete] = React.useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    const selectedFiles = Array.from(fileList ?? []);
    if (selectedFiles.length === 0) return;

    const nextFiles = [...files, ...selectedFiles];
    const validationError = validateAttachmentFiles(nextFiles);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setFiles(nextFiles);
  };

  const toggleDeleteFile = (fileId: string | number) => {
    const normalizedFileId = String(fileId);
    setFileIdsToDelete((current) => {
      const next = new Set(current);
      if (next.has(normalizedFileId)) {
        next.delete(normalizedFileId);
      } else {
        next.add(normalizedFileId);
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (attachment.id === undefined || attachment.id === null) return;

    if (files.length > 0) {
      const validationError = validateAttachmentFiles(files);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    const remainingFileCount =
      (attachment.files ?? []).filter(
        (file) =>
          file.id === undefined ||
          file.id === null ||
          !fileIdsToDelete.has(String(file.id)),
      ).length + files.length;
    if (remainingFileCount === 0) {
      toast.error("Vui lòng giữ lại hoặc thêm ít nhất một ảnh.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.updateProductionOrderAttachment(
        attachment.id,
        {
          attachment_type: attachmentType,
          description: description.trim() || null,
          requires_approval: true,
        },
      );

      await Promise.all(
        Array.from(fileIdsToDelete).map((fileId) =>
          productionOrdersService.deleteProductionOrderAttachmentFile(fileId),
        ),
      );

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        await productionOrdersService.addProductionOrderAttachmentFiles(
          attachment.id,
          formData,
        );
      }

      toast.success("Đã cập nhật hình ảnh đính kèm.");
      await onSaved();
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể cập nhật record đính kèm."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[340px] rounded-md bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-center text-xl font-semibold uppercase">
          Sửa hình ảnh đính kèm
        </p>
        <div className="space-y-2">
          <Label>Loại đính kèm</Label>
          <Select
            value={attachmentType}
            disabled={isSubmitting}
            onValueChange={setAttachmentType}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTACHMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-attachment-description">Mô tả</Label>
          <Textarea
            id="edit-attachment-description"
            value={description}
            disabled={isSubmitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label>Ảnh đính kèm hiện có</Label>
          {attachment.files?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {attachment.files.map((file, index) => {
                const label =
                  file.file_name ??
                  file.filename ??
                  getFileName(file.file_path) ??
                  `Ảnh ${index + 1}`;
                const canDelete = file.id !== undefined && file.id !== null;
                const markedForDeletion =
                  canDelete && fileIdsToDelete.has(String(file.id));

                return (
                  <div
                    key={file.id ?? file.file_path ?? index}
                    className={`relative overflow-hidden rounded border bg-gray-50 ${
                      markedForDeletion ? "opacity-50" : ""
                    }`}
                  >
                    {canDelete ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        disabled={isSubmitting}
                        className="absolute right-2 top-2 z-10 bg-black text-white hover:bg-black/80"
                        onClick={() => toggleDeleteFile(file.id!)}
                        title={markedForDeletion ? "Hoàn tác xóa" : "Xóa ảnh"}
                        aria-label={`${
                          markedForDeletion ? "Hoàn tác xóa" : "Xóa"
                        } ${label}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                    <AttachmentImage filePath={file.file_path} alt={label} />
                    <p className="truncate p-2 text-xs text-gray-600" title={label}>
                      {markedForDeletion ? `Sẽ xóa: ${label}` : label}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-dashed p-4 text-center text-sm text-gray-500">
              Chưa có ảnh đính kèm.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Thêm ảnh</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={isSubmitting}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className="sr-only"
            disabled={isSubmitting}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" /> Chọn ảnh
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="size-4" /> Chụp ảnh
            </Button>
          </div>
          {files.length > 0 ? (
            <div className="space-y-2 rounded border bg-gray-50 p-3">
              <p className="text-sm font-medium">Đã chọn {files.length} ảnh mới</p>
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isSubmitting}
                    onClick={() =>
                      setFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                    aria-label={`Bỏ chọn ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditAttachmentButton({
  attachment,
  onSaved,
  disabled,
}: {
  attachment: ProductionOrderAttachment;
  onSaved: () => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog modal={false} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          disabled={disabled}
          className="bg-black text-white hover:bg-black/80"
          title="Sửa"
          aria-label="Sửa record đính kèm"
        >
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle />
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
          <EditAttachmentForm
            attachment={attachment}
            onSaved={onSaved}
            onClose={() => setOpen(false)}
          />
        </div>
        <DialogFooter />
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

export default function ProductionOrderAttachmentDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [approvalDialogStatus, setApprovalDialogStatus] = React.useState<
    "approved" | "rejected" | null
  >(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const detailKey = API_ROUTES.productionOrders.attachmentDetail(id);
  const { data, error, mutate } = useSWR<ProductionOrderAttachment>(
    detailKey,
    () => productionOrdersService.fetchProductionOrderAttachmentById(id),
  );
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.attachments(data.production_order_id)
    : null;
  const isLocked =
    data?.approval_status === "approved" || data?.approval_status === "rejected";
  const isPending = data?.requires_approval && data.approval_status === "pending";

  const refresh = async () => {
    await mutate();
    if (listKey) await mutateGlobal(listKey);
  };

  const handleApproval = async (
    status: "approved" | "rejected",
    note?: string | null,
  ) => {
    try {
      setIsSubmitting(true);
      await productionOrdersService.updateProductionOrderAttachmentApproval(
        id,
        status,
        note?.trim() || null,
      );
      toast.success(status === "approved" ? "Đã duyệt record đính kèm." : "Đã từ chối record đính kèm.");
      await refresh();
      setApprovalDialogStatus(null);
      setRejectionReason("");
    } catch (approvalError: any) {
      toast.error(getErrorMessage(approvalError, "Không thể cập nhật trạng thái duyệt."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!approvalDialogStatus) return;

    if (approvalDialogStatus === "rejected" && !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }

    await handleApproval(
      approvalDialogStatus,
      approvalDialogStatus === "rejected" ? rejectionReason : null,
    );
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa record và toàn bộ ảnh đính kèm?")) return;
    try {
      setIsSubmitting(true);
      await productionOrdersService.deleteProductionOrderAttachment(id);
      if (listKey) await mutateGlobal(listKey);
      toast.success("Đã xóa record đính kèm.");
      onClose();
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa record đính kèm."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Hình ảnh đính kèm" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy record đính kèm.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-4xl space-y-4 rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <DetailPanelHeader
        title={`Hình ảnh đính kèm #${data.id}`}
        subtitle={formatDateTime(data.entered_at ?? data.created_at)}
        actions={
          !isLocked ? (
            <>
              <EditAttachmentButton
                attachment={data}
                onSaved={refresh}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                size="icon-sm"
                disabled={isSubmitting}
                className="bg-black text-white hover:bg-black/80"
                onClick={handleDelete}
                title="Xóa"
                aria-label="Xóa record đính kèm"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          ) : null
        }
        onClose={onClose}
      />

      <Dialog
        open={approvalDialogStatus !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setApprovalDialogStatus(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {approvalDialogStatus === "approved"
                ? "Xác nhận duyệt"
                : "Xác nhận từ chối"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApprovalSubmit} className="space-y-5">
            {approvalDialogStatus === "approved" ? (
              <p className="text-sm text-gray-600">
                Bạn có chắc chắn muốn duyệt hình ảnh{" "}
                {formatAttachmentType(data.attachment_type).toLocaleLowerCase(
                  "vi-VN",
                )}{" "}
                này?
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Lý do từ chối</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  required
                  autoFocus
                  disabled={isSubmitting}
                  placeholder="Nhập lý do từ chối"
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setApprovalDialogStatus(null);
                  setRejectionReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (approvalDialogStatus === "rejected" &&
                    !rejectionReason.trim())
                }
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {isSubmitting
                  ? "Đang xử lý..."
                  : approvalDialogStatus === "approved"
                    ? "Xác nhận duyệt"
                    : "Xác nhận từ chối"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isPending ? (
        <div className="mt-4 flex flex-wrap items-start gap-2 rounded border bg-gray-50 p-3">
          <div className="inline-flex flex-col items-center p-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setApprovalDialogStatus("approved")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
              title="Duyệt"
            >
              <Check className="size-5" />
            </button>
            <p className="mt-1 text-sm font-semibold">Duyệt</p>
          </div>
          <div className="inline-flex flex-col items-center p-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setApprovalDialogStatus("rejected")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
              title="Từ chối"
            >
              <X className="size-5" />
            </button>
            <p className="mt-1 text-sm font-semibold">Từ chối</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <FieldDisplay lable="Mã lệnh sản xuất" value={String(data.production_order_id ?? "")} />
        <FieldDisplay lable="Loại đính kèm" value={formatAttachmentType(data.attachment_type)} />
        <FieldDisplay lable="Mô tả" value={data.description ?? ""} />
        <FieldDisplay lable="Yêu cầu duyệt" value={data.requires_approval ? "Có" : "Không"} />
        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600">
            Trạng thái
          </div>
          <div className="flex-1 text-left">
            <Badge variant="outline" className={getStatusClassName(data.approval_status)}>
              {formatApprovalStatus(data.approval_status)}
            </Badge>
          </div>
        </div>
        <FieldDisplay lable="Ghi chú duyệt" value={data.approval_note ?? ""} />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.enteredBy)} />
        <FieldDisplay lable="Thời điểm nhập" value={formatDateTime(data.entered_at ?? data.created_at)} />
        <FieldDisplay lable="Người duyệt" value={getUserLabel(data.approvedBy)} />
        <FieldDisplay lable="Thời điểm duyệt" value={formatDateTime(data.approved_at)} />

        <div className="pt-2">
          <h3 className="mb-3 text-left font-semibold text-gray-700">
            Ảnh đính kèm ({data.files?.length ?? 0})
          </h3>
          {data.files?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.files.map((file, index) => {
                const label = file.file_name ?? file.filename ?? getFileName(file.file_path) ?? `Ảnh ${index + 1}`;
                return (
                  <div key={file.id ?? file.file_path ?? index} className="relative overflow-hidden rounded border bg-gray-50">
                    <AttachmentImage filePath={file.file_path} alt={label} />
                    <p className="truncate p-2 text-xs text-gray-600" title={label}>{label}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-dashed p-5 text-center text-sm text-gray-500">
              Chưa có ảnh đính kèm.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
