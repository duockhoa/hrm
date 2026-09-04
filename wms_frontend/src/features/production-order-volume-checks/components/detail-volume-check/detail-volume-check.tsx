"use client";

import { ImageUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { mutate as mutateGlobal } from "swr";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
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
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type {
  ProductionOrderVolumeCheck,
  VolumeCheckImage,
} from "../../types";
import AddVolumeCheckImagesForm from "../add-volume-check-images-form/add-volume-check-images-form";
import EditVolumeCheck from "../edit-volume-check/edit-volume-check";
import {
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatVolume,
  getUserLabel,
  VOLUME_KEYS,
} from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

const getImageFilename = (imagePath: string) => {
  const filename = imagePath.split(/[/?#]/).filter(Boolean).pop() ?? "";

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

const getVolumeCheckImageUrl = (imagePath: string) =>
  API_ROUTES.productionOrders.volumeCheckImageFile(
    getImageFilename(imagePath),
  );

function VolumeCheckImageCard({
  image,
  isDeleting,
  onDelete,
}: {
  image: VolumeCheckImage;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const filename = getImageFilename(image.image_path);
  const metadata = [
    getUserLabel(image.createdBy),
    formatDateTime(image.created_at),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded border bg-white">
      <AuthenticatedImage
        src={getVolumeCheckImageUrl(image.image_path)}
        alt={filename || "Ảnh kiểm tra thể tích"}
        className="aspect-square w-full"
        height={240}
        width={240}
        loading="lazy"
        objectFit="contain"
      />
      <div className="flex items-center justify-between gap-2 border-t p-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-700">{filename}</p>
          {metadata ? (
            <p className="truncate text-[11px] text-gray-500">{metadata}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isDeleting}
          aria-label={`Xóa ảnh ${filename}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function VolumeCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VolumeCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error, mutate } = useSWR<ProductionOrderVolumeCheck>(
    API_ROUTES.productionOrders.volumeCheckDetail(id),
    () => productionOrdersService.fetchVolumeCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingImages, setIsAddingImages] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<
    string | number | null
  >(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.volumeChecks(data.production_order_id)
    : null;

  const refresh = async () => {
    await mutate();
    if (listKey) {
      await mutateGlobal(listKey);
    }
  };

  const handleDeleteImage = async (image: VolumeCheckImage) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh kiểm tra này không?")) {
      return;
    }

    try {
      setDeletingImageId(image.id);
      await productionOrdersService.deleteVolumeCheckImage(image.id);
      await refresh();
      toast.success("Đã xóa ảnh kiểm tra thể tích.");
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa ảnh kiểm tra thể tích."),
      );
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteVolumeCheck(data.id);
      toast.success("Đã xóa kiểm tra thể tích.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa kiểm tra thể tích.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra thể tích" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra thể tích.
        </div>
      </div>
    );
  }

  if (!data) {
    return <VolumeCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra thể tích #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setIsAddingImages(true)}
            >
              <ImageUp className="size-4" /> Thêm ảnh
            </Button>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật kiểm tra thể tích
            </DialogTitle>
          </DialogHeader>
          <EditVolumeCheck
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
        <DialogContent className="md:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Thêm ảnh kiểm tra thể tích</DialogTitle>
          </DialogHeader>
          <AddVolumeCheckImagesForm
            checkId={data.id ?? id}
            existingImageCount={data.images?.length ?? 0}
            onSaved={refresh}
            onClose={() => setIsAddingImages(false)}
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
            <DialogTitle>Xác nhận xóa kiểm tra thể tích</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi kiểm tra thể tích này không?
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
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay lable="Dạng" value={formatText(data.package_type)} />
        <FieldDisplay
          lable="Dạng bào chế"
          value={formatDosageFormStage(data.dosage_form_stage)}
        />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        {VOLUME_KEYS.map((key, index) => (
          <FieldDisplay
            key={key}
            lable={`Đơn vị ${index + 1}`}
            value={`${formatVolume(data[key])} ${data.unit ?? "ml"}`.trim()}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
            Ảnh kiểm tra
          </div>
          <div className="flex-1 text-left text-gray-800">
            {data.images && data.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.images.map((image) => (
                  <VolumeCheckImageCard
                    key={image.id}
                    image={image}
                    isDeleting={deletingImageId === image.id}
                    onDelete={() => void handleDeleteImage(image)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed p-4 text-center text-sm text-gray-500">
                Không có ảnh.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
