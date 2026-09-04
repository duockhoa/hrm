"use client";

import { ImageUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
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
  ProductSensoryCheckImage,
  ProductionOrderProductSensoryCheck,
} from "../../types";
import {
  UNIT_RESULT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatPassFail,
  formatText,
  getUserLabel,
} from "../../utils";
import FormEditProductionOrderProductSensoryCheck from "../form-edit-production-order-product-sensory-check/form-edit-production-order-product-sensory-check";
import AddProductSensoryCheckImagesForm from "../add-product-sensory-check-images-form/add-product-sensory-check-images-form";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function ProductSensoryCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 13 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

const getImageFilename = (imagePath: string) => {
  const filename = imagePath.split(/[/?#]/).filter(Boolean).pop() ?? "";

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

const getProductSensoryImageUrl = (imagePath: string) =>
  API_ROUTES.productionOrders.productSensoryCheckImageFile(
    getImageFilename(imagePath),
  );

function ProductSensoryImage({
  image,
  isDeleting,
  onDelete,
}: {
  image: ProductSensoryCheckImage;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded border bg-white">
      <AuthenticatedImage
        src={getProductSensoryImageUrl(image.image_path)}
        alt={getImageFilename(image.image_path) || "Ảnh kiểm tra cảm quan"}
        className="aspect-square w-full"
        height={240}
        width={240}
        loading="lazy"
        objectFit="contain"
      />
      <div className="flex items-center justify-between gap-2 border-t p-2">
        <span className="truncate text-xs text-gray-600">
          {getImageFilename(image.image_path)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isDeleting}
          aria-label={`Xóa ảnh ${getImageFilename(image.image_path)}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProductSensoryCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error, mutate } = useSWR<ProductionOrderProductSensoryCheck>(
    API_ROUTES.productionOrders.productSensoryCheckDetail(id),
    () => productionOrdersService.fetchProductSensoryCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingImages, setIsAddingImages] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<
    string | number | null
  >(null);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.productSensoryChecks(data.production_order_id)
    : null;

  const refresh = async () => {
    await mutate();
    if (listKey) {
      await mutateGlobal(listKey);
    }
  };

  const handleDeleteImage = async (image: ProductSensoryCheckImage) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh kiểm tra này không?")) {
      return;
    }

    try {
      setDeletingImageId(image.id);
      await productionOrdersService.deleteProductSensoryCheckImage(image.id);
      await refresh();
      toast.success("Đã xóa ảnh kiểm tra cảm quan sản phẩm.");
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa ảnh kiểm tra."));
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteProductSensoryCheck(data.id);
      toast.success("Đã xóa kiểm tra cảm quan sản phẩm.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa kiểm tra cảm quan sản phẩm."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra cảm quan sản phẩm" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy phiếu kiểm tra cảm quan sản phẩm.
        </div>
      </div>
    );
  }

  if (!data) {
    return <ProductSensoryCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra cảm quan sản phẩm #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddingImages(true)}
              title="Thêm ảnh"
              variant="outline"
            >
              <ImageUp className="size-4" />
              Thêm ảnh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsEditing(true)}
              title="Sửa"
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              <Pencil className="size-4" />
              Sửa
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              title="Xóa"
              className="bg-black text-white hover:bg-gray-800"
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật kiểm tra cảm quan sản phẩm
            </DialogTitle>
          </DialogHeader>
          <FormEditProductionOrderProductSensoryCheck
            productionOrderId={data.production_order_id ?? ""}
            data={data}
            onClose={() => setIsEditing(false)}
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
            <DialogTitle>Thêm ảnh kiểm tra cảm quan sản phẩm</DialogTitle>
          </DialogHeader>
          <AddProductSensoryCheckImagesForm
            checkId={data.id ?? id}
            existingImageCount={data.images?.length ?? 0}
            onSaved={refresh}
            onClose={() => setIsAddingImages(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Dạng bào chế"
          value={formatDosageFormStage(data.dosage_form_stage)}
        />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        {UNIT_RESULT_KEYS.map((unitKey, index) => (
          <FieldDisplay
            key={unitKey}
            lable={`Đơn vị ${index + 1}`}
            value={formatPassFail(data[unitKey])}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Cập nhật"
          value={formatDateTime(data.updated_at)}
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
                  <ProductSensoryImage
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
