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
import type { ProductionOrderDisintegrationCheck } from "../../types";
import {
  UNIT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatPassFail,
  getUserLabel,
} from "../../utils";
import EditDisintegrationCheckForm from "../edit-disintegration-check/edit-disintegration-check";

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function DisintegrationCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
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

export default function DisintegrationCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderDisintegrationCheck>(
    API_ROUTES.productionOrders.disintegrationCheckDetail(id),
    () => productionOrdersService.fetchDisintegrationCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.disintegrationChecks(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteDisintegrationCheck(data.id);
      toast.success("Đã xóa kiểm tra độ rã.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa kiểm tra độ rã."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Độ rã" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy phiếu kiểm tra độ rã.
        </div>
      </div>
    );
  }

  if (!data) {
    return <DisintegrationCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Độ rã #${data.id}`}
        subtitle={formatDateTime(data.checked_at)}
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
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Cập nhật kiểm tra độ rã
            </DialogTitle>
          </DialogHeader>
          <EditDisintegrationCheckForm
            data={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => {
              setIsEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Dạng/công đoạn"
          value={formatDosageFormStage(data.dosage_form_stage)}
        />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        {UNIT_KEYS.map((unitKey, index) => (
          <FieldDisplay
            key={unitKey}
            lable={`Viên ${index + 1}`}
            value={formatPassFail(data[unitKey])}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.checked_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
