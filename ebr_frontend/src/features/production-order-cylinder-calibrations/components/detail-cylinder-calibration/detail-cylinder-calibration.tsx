"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
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
import type { ProductionOrderCylinderCalibration } from "../../types";
import {
  formatCalibrationNumber,
  formatDateTime,
  getUserLabel,
} from "../../utils";
import FormProductionOrderCylinderCalibration from "../form-production-order-cylinder-calibration/form-production-order-cylinder-calibration";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function CylinderCalibrationDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const key = API_ROUTES.productionOrders.cylinderCalibration(id);
  const { data, error } = useSWR<ProductionOrderCylinderCalibration>(key, () =>
    productionOrdersService.fetchCylinderCalibration(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await productionOrdersService.deleteCylinderCalibration(id);
      toast.success("Đã xóa thông số hiệu chỉnh ống đong.");
      await mutate(key, null, { revalidate: false });
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(
          deleteError,
          "Không thể xóa thông số hiệu chỉnh ống đong.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Hiệu chỉnh ống đong" onClose={onClose} />
        <p className="mt-4 text-sm text-gray-500">Không tìm thấy dữ liệu.</p>
      </div>
    );
  }
  if (!data) {
    return <Skeleton className="h-72 w-full max-w-4xl" />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title="Hiệu chỉnh ống đong"
        subtitle={formatDateTime(data.updated_at ?? data.created_at)}
        actions={
          <>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
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
              Cập nhật thông số hiệu chỉnh ống đong
            </DialogTitle>
          </DialogHeader>
          <FormProductionOrderCylinderCalibration
            productionOrderId={id}
            onClose={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay lable="Mã lệnh sản xuất" value={String(id)} />
        <FieldDisplay lable="Mã ống đong" value={data.cylinder_code ?? ""} />
        <FieldDisplay
          lable="Thông số hiệu chỉnh"
          value={formatCalibrationNumber(data.calibration_number)}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Cập nhật lần cuối"
          value={formatDateTime(data.updated_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
