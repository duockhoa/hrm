"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderSamplingRecord } from "../../types";
import {
  formatDateTime,
  formatNumber,
  formatText,
  getUserLabel,
} from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function SamplingRecordDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SamplingRecordDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderSamplingRecord>(
    API_ROUTES.productionOrders.samplingRecordDetail(id),
    () => productionOrdersService.fetchSamplingRecordById(id),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.samplingRecords(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSamplingRecord(data.id);
      toast.success("Đã xóa dữ liệu lấy mẫu.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa dữ liệu lấy mẫu."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Lấy mẫu" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi lấy mẫu.
        </div>
      </div>
    );
  }

  if (!data) {
    return <SamplingRecordDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Lấy mẫu #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
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
        }
        onClose={onClose}
      />

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay lable="Loại mẫu" value={formatText(data.sampling_type)} />
        <FieldDisplay lable="Số lượng" value={formatNumber(data.quantity)} />
        <FieldDisplay lable="Đơn vị tính" value={formatText(data.unit)} />
        <FieldDisplay
          lable="Thời điểm"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
