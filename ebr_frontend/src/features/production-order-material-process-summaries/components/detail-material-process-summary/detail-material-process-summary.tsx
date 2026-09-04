"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
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
import type { ProductionOrderMaterialProcessSummary } from "../../types";
import FormProductionOrderExtractionSummary from "../form-production-order-extraction-summary/form-production-order-extraction-summary";

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatQuantity = (
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  if (quantity === null || quantity === undefined || quantity === "") {
    return "—";
  }

  const numericValue = Number(quantity);
  const value = Number.isNaN(numericValue)
    ? String(quantity)
    : numericValue.toLocaleString("vi-VN");
  return `${value} ${unit || "kg"}`;
};

const getUserLabel = (
  user: ProductionOrderMaterialProcessSummary["createdBy"],
) => user?.name || user?.username || user?.email || "—";

function AuthenticatedMaterialProcessImage({
  imagePath,
}: {
  imagePath?: string | null;
}) {
  if (!imagePath) return null;

  return (
    <AuthenticatedImage
      src={imagePath}
      alt="Ảnh tổng kết chiết cao"
      className="mx-auto h-72 w-full max-w-xl"
      loading="lazy"
      objectFit="contain"
    />
  );
}

export default function MaterialProcessSummaryDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const detailKey =
    API_ROUTES.productionOrders.materialProcessSummaryDetail(id);
  const { data, error } = useSWR<ProductionOrderMaterialProcessSummary>(
    detailKey,
    () => productionOrdersService.fetchMaterialProcessSummaryById(id),
  );
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.materialProcessSummaries(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (data?.id === null || data?.id === undefined) return;

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteMaterialProcessSummary(data.id);
      if (listKey) await mutateGlobal(listKey);
      toast.success("Đã xóa tổng kết chiết cao.");
      onClose();
    } catch (deleteError: unknown) {
      const message = (
        deleteError as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(message ?? "Không thể xóa tổng kết chiết cao.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Tổng kết chiết cao" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy tổng kết chiết cao.
        </div>
      </div>
    );
  }

  if (!data) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }

  const summaryTitle =
    data.process_stage === "Sản xuất bột dược liệu"
      ? "Tổng kết bột dược liệu"
      : "Tổng kết chiết cao";

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`${summaryTitle} #${data.id}`}
        onClose={onClose}
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
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Cập nhật {summaryTitle.toLocaleLowerCase("vi-VN")}
            </DialogTitle>
          </DialogHeader>
          <FormProductionOrderExtractionSummary
            productionOrderId={data.production_order_id ?? ""}
            data={data}
            onClose={() => setIsEditing(false)}
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
            <DialogTitle>Xác nhận xóa tổng kết chiết cao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi tổng kết này không?
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
          value={
            data.production_order_id === null ||
            data.production_order_id === undefined
              ? "—"
              : String(data.production_order_id)
          }
        />
        <FieldDisplay lable="Giai đoạn" value={data.process_stage || "—"} />
        <FieldDisplay
          lable="Khối lượng thu được"
          value={formatQuantity(data.yielded_quantity, data.yielded_unit)}
        />
        <FieldDisplay
          lable="Hàm ẩm"
          value={
            data.moisture_percent === null ||
            data.moisture_percent === undefined
              ? "—"
              : `${data.moisture_percent}%`
          }
        />
        <FieldDisplay lable="Ghi chú" value={data.note || "—"} />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
        {data.image_path ? (
          <div className="text-left">
            <p className="mb-2 text-sm font-medium text-gray-700">Ảnh</p>
            <AuthenticatedMaterialProcessImage
              key={data.image_path}
              imagePath={data.image_path}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
