"use client";

import * as React from "react";
import { Images, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  PreSecondaryPackagingCheckImage,
  ProductionOrderPreSecondaryPackagingCheck,
} from "../types";
import {
  formatDateTime,
  formatQuantity,
  getUserLabel,
  MAX_CHECK_IMAGES,
  validateCheckImages,
} from "../utils";
import EditPreSecondaryPackagingCheck from "./edit-pre-secondary-packaging-check";
import MultiImagePicker from "./multi-image-picker";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function AuthenticatedCheckImage({
  image,
  deleting,
  onDelete,
}: {
  image: PreSecondaryPackagingCheckImage;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded border bg-gray-50">
      <AuthenticatedImage
        src={image.image_path}
        alt={`Ảnh kiểm tra #${image.id}`}
        className="h-48 w-full rounded-none border-0"
        height={192}
        width={320}
        loading="lazy"
        objectFit="contain"
      />
      <Button
        type="button"
        size="icon-sm"
        variant="destructive"
        className="absolute right-2 top-2"
        disabled={deleting}
        aria-label={`Xóa ảnh #${image.id}`}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function AddImagesForm({
  check,
  onSaved,
  onCancel,
}: {
  check: ProductionOrderPreSecondaryPackagingCheck;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const existingCount = check.images?.length ?? 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (files.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ảnh.");
      return;
    }
    const validationError = validateCheckImages(files, existingCount);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    try {
      setIsSubmitting(true);
      await productionOrdersService.addPreSecondaryPackagingCheckImages(
        check.id,
        formData,
      );
      await onSaved();
      toast.success(`Đã thêm ${files.length} ảnh kiểm tra.`);
      onCancel();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể thêm ảnh kiểm tra."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-center text-xl font-semibold uppercase">
        Thêm ảnh kiểm tra
      </p>
      <MultiImagePicker
        files={files}
        onChange={setFiles}
        existingCount={existingCount}
        disabled={isSubmitting}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isSubmitting || files.length === 0}>
          {isSubmitting ? "Đang tải..." : "Thêm ảnh"}
        </Button>
      </div>
    </form>
  );
}

export default function PreSecondaryPackagingCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const detailKey =
    API_ROUTES.productionOrders.preSecondaryPackagingCheckDetail(id);
  const { data, error, mutate } =
    useSWR<ProductionOrderPreSecondaryPackagingCheck>(detailKey, () =>
      productionOrdersService.fetchPreSecondaryPackagingCheckById(id),
    );
  const [isEditing, setIsEditing] = React.useState(false);
  const [isAddingImages, setIsAddingImages] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deletingImageId, setDeletingImageId] = React.useState<
    string | number | null
  >(null);

  const listKey =
    data?.production_order_id !== null &&
    data?.production_order_id !== undefined
      ? API_ROUTES.productionOrders.preSecondaryPackagingChecks(
          data.production_order_id,
        )
      : null;

  const refresh = async () => {
    await mutate();
    if (listKey) await mutateGlobal(listKey);
  };

  const handleDeleteImage = async (image: PreSecondaryPackagingCheckImage) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh kiểm tra này không?"))
      return;
    try {
      setDeletingImageId(image.id);
      await productionOrdersService.deletePreSecondaryPackagingCheckImage(
        image.id,
      );
      await refresh();
      toast.success("Đã xóa ảnh kiểm tra.");
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa ảnh kiểm tra."));
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    try {
      setIsDeleting(true);
      await productionOrdersService.deletePreSecondaryPackagingCheck(data.id);
      if (listKey) await mutateGlobal(listKey);
      toast.success("Đã xóa bản ghi kiểm tra BTP trước đóng gói.");
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa bản ghi kiểm tra."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Kiểm tra BTP trước đóng gói"
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-6 h-80 w-full" />
      </div>
    );
  }

  const imageCount = data.images?.length ?? 0;

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra BTP trước đóng gói #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Cập nhật kiểm tra</DialogTitle>
          </DialogHeader>
          <EditPreSecondaryPackagingCheck
            data={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isAddingImages}
        onOpenChange={setIsAddingImages}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Thêm ảnh kiểm tra</DialogTitle>
          </DialogHeader>
          <AddImagesForm
            check={data}
            onSaved={refresh}
            onCancel={() => setIsAddingImages(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bản ghi kiểm tra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Toàn bộ ảnh thuộc bản ghi cũng sẽ bị xóa và không thể khôi phục.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={String(data.production_order_id ?? "—")}
        />
        <FieldDisplay
          lable="Yêu cầu kiểm tra"
          value={data.requirement || "—"}
        />
        <FieldDisplay
          lable="Số lượng kiểm tra"
          value={formatQuantity(data.quantity_checked)}
        />
        <FieldDisplay
          lable="Số lượng đạt"
          value={formatQuantity(data.quantity_passed)}
        />
        <FieldDisplay lable="Người tạo" value={getUserLabel(data.createdBy)} />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Cập nhật lần cuối"
          value={formatDateTime(data.updated_at)}
        />

        <div className="mt-2 border-t pt-4 text-left">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <Images className="size-5" /> Ảnh kiểm tra ({imageCount}/
              {MAX_CHECK_IMAGES})
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={imageCount >= MAX_CHECK_IMAGES}
              onClick={() => setIsAddingImages(true)}
            >
              <Plus className="size-4" /> Thêm ảnh
            </Button>
          </div>
          {imageCount === 0 ? (
            <div className="rounded border border-dashed p-6 text-center text-sm text-gray-500">
              Chưa có ảnh kiểm tra.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.images?.map((image) => (
                <AuthenticatedCheckImage
                  key={image.id}
                  image={image}
                  deleting={String(deletingImageId) === String(image.id)}
                  onDelete={() => handleDeleteImage(image)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
