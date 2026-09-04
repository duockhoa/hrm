"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
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
import type { ProductionOrderVialInspectionCheck } from "../../types";
import {
  formatDateTime,
  formatInteger,
  formatText,
  getUserLabel,
} from "../../utils";
import FormProductionOrderVialInspectionCheck from "../form-production-order-vial-inspection-check/form-production-order-vial-inspection-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function VialInspectionCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VialInspectionCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderVialInspectionCheck>(
    API_ROUTES.productionOrders.vialInspectionCheckDetail(id),
    () => productionOrdersService.fetchVialInspectionCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.vialInspectionChecks(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    const isConfirmed = window.confirm(
      `Bạn có chắc muốn xóa bản ghi soi lọ #${data.id}?`,
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteVialInspectionCheck(data.id);
      toast.success("Đã xóa soi lọ.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa soi lọ."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Soi lọ" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi soi lọ.
        </div>
      </div>
    );
  }

  if (!data) {
    return <VialInspectionCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Soi lọ #${data.id}`}
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
            <DialogTitle className="sr-only">Cập nhật soi lọ</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <FormProductionOrderVialInspectionCheck
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
        <FieldDisplay lable="Bao số" value={formatInteger(data.bag_number)} />
        <FieldDisplay
          lable="Số lọ có sợi"
          value={formatInteger(data.fiber_vial_count)}
        />
        <FieldDisplay
          lable="Số lượng vẩn"
          value={formatInteger(data.particulate_count)}
        />
        <FieldDisplay
          lable="Số lượng hỏng"
          value={formatInteger(data.damaged_count)}
        />
        <FieldDisplay
          lable="Số lượng lỗi khác"
          value={formatInteger(data.other_defect_count)}
        />
        <FieldDisplay lable="Ghi chú" value={formatText(data.note)} />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
