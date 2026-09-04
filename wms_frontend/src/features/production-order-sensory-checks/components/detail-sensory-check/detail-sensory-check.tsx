"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import type { ProductionOrderSensoryCheck } from "../../types";
import {
  formatDateTime,
  formatSensoryOption,
  formatText,
  getFileNameFromPath,
  getUserLabel,
} from "../../utils";
import FormProductionOrderSensoryCheck from "../form-production-order-sensory-check/form-production-order-sensory-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function SensoryCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthenticatedSensoryImage({
  imagePath,
}: {
  imagePath?: string | null;
}) {
  if (!imagePath) {
    return (
      <div className="rounded border border-dashed p-4 text-center text-sm text-gray-500">
        Không có ảnh.
      </div>
    );
  }

  return (
    <AuthenticatedImage
      src={imagePath}
      alt={getFileNameFromPath(imagePath) || "Ảnh thử mùi vị"}
      className="aspect-square w-full"
      height={320}
      width={320}
      loading="lazy"
      objectFit="contain"
    />
  );
}

export default function SensoryCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderSensoryCheck>(
    API_ROUTES.productionOrders.sensoryCheckDetail(id),
    () => productionOrdersService.fetchSensoryCheckById(id),
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.sensoryChecks(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSensoryCheck(data.id);
      toast.success("Đã xóa thử mùi vị.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa thử mùi vị."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Thử mùi vị" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi thử mùi vị.
        </div>
      </div>
    );
  }

  if (!data) {
    return <SensoryCheckDetailSkeleton />;
  }

  const sensoryImages =
    data.images && data.images.length > 0
      ? data.images
      : data.image_path
        ? [{ id: "legacy", image_path: data.image_path }]
        : [];

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Thử mùi vị #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
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
        <DialogContent className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Cập nhật thử mùi vị</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <FormProductionOrderSensoryCheck
              productionOrderId={data.production_order_id ?? ""}
              data={data}
              onClose={() => setIsEditing(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay lable="Màu sắc" value={formatSensoryOption(data.color)} />
        <FieldDisplay lable="Mùi" value={formatSensoryOption(data.smell)} />
        <FieldDisplay lable="Vị" value={formatSensoryOption(data.taste)} />
        <FieldDisplay lable="Ghi chú" value={formatText(data.note)} />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />

        <div className="flex w-full justify-start gap-4">
          <div className="m-1 min-w-[150px] max-w-[200px] pr-2 text-left font-semibold text-gray-600 wrap-anywhere">
            Ảnh
          </div>
          <div className="flex-1 text-left text-gray-800">
            {sensoryImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {sensoryImages.map((image) => (
                  <AuthenticatedSensoryImage
                    key={image.id}
                    imagePath={image.image_path}
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
