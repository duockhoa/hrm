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
import type { ProductionOrderPostHomogenizationGranuleCheck } from "../../types";
import EditPostHomogenizationGranuleCheck from "../edit-post-homogenization-granule-check/edit-post-homogenization-granule-check";
import {
  formatDateTime,
  formatDecimal,
  formatText,
  getFileNameFromPath,
  getUserLabel,
} from "../../utils";

function PostHomogenizationGranuleCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthenticatedGranuleImage({
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
      alt={getFileNameFromPath(imagePath) || "Ảnh kiểm tra cốm sau đồng nhất"}
      className="h-72 w-full"
      loading="lazy"
      objectFit="contain"
    />
  );
}

export default function PostHomogenizationGranuleCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderPostHomogenizationGranuleCheck>(
    API_ROUTES.productionOrders.postHomogenizationGranuleCheckDetail(id),
    () => productionOrdersService.fetchPostHomogenizationGranuleCheckById(id),
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.postHomogenizationGranuleChecks(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deletePostHomogenizationGranuleCheck(
        data.id,
      );
      toast.success("Đã xóa kiểm tra cốm sau đồng nhất.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa kiểm tra cốm sau đồng nhất.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Cốm sau đồng nhất" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra cốm sau đồng nhất.
        </div>
      </div>
    );
  }

  if (!data) {
    return <PostHomogenizationGranuleCheckDetailSkeleton />;
  }

  const densityUnit = data.density_unit || "g/ml";

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Cốm sau đồng nhất #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
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
        <DialogContent className="md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật kiểm tra cốm sau đồng nhất
            </DialogTitle>
          </DialogHeader>
          <EditPostHomogenizationGranuleCheck
            data={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
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
            <DialogTitle>Xác nhận xóa kiểm tra cốm sau đồng nhất</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi kiểm tra cốm sau đồng nhất này
              không?
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
        <FieldDisplay
          lable="Khối lượng riêng thô"
          value={`${formatDecimal(data.bulk_density, 2)} ${densityUnit}`.trim()}
        />
        <FieldDisplay
          lable="Khối lượng riêng gõ"
          value={`${formatDecimal(data.tapped_density, 2)} ${densityUnit}`.trim()}
        />
        <FieldDisplay
          lable="Chỉ số Carr (%)"
          value={formatDecimal(data.carr_index, 4)}
        />
        <FieldDisplay
          lable="Hàm ẩm (%)"
          value={formatDecimal(data.moisture_percent, 2)}
        />
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
            <AuthenticatedGranuleImage imagePath={data.image_path} />
          </div>
        </div>
      </div>
    </div>
  );
}
