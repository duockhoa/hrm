"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import FormProductionOrderDisinfectantPreparation from "../form-production-order-disinfectant-preparation/form-production-order-disinfectant-preparation";
import type { ProductionOrderDisinfectantPreparation } from "../../types";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatText,
  getUserLabel,
  getWorkshopLabel,
} from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function DisinfectantPreparationDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-28" />
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

export default function DisinfectantPreparationDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error, mutate } = useSWR<ProductionOrderDisinfectantPreparation>(
    API_ROUTES.productionOrders.disinfectantPreparationDetail(id),
    () => productionOrdersService.fetchDisinfectantPreparationById(id),
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.disinfectantPreparations(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteDisinfectantPreparation(data.id);
      toast.success("Đã xóa dữ liệu pha chế chất sát khuẩn.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(
          deleteError,
          "Không thể xóa dữ liệu pha chế chất sát khuẩn.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Pha chế chất sát khuẩn" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi pha chế chất sát khuẩn.
        </div>
      </div>
    );
  }

  if (!data) {
    return <DisinfectantPreparationDetailSkeleton />;
  }

  if (isEditing) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title={`Pha chế chất sát khuẩn #${data.id}`}
          subtitle={formatDateTime(data.created_at)}
          onClose={onClose}
        />
        <div className="mt-4">
          <FormProductionOrderDisinfectantPreparation
            data={data}
            onClose={() => setIsEditing(false)}
            onSaved={async () => {
              await mutate();
              setIsEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Pha chế chất sát khuẩn #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsEditing(true)}
              title="Sửa"
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

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Xưởng sản xuất"
          value={getWorkshopLabel(data.workshop, data.workshop_id)}
        />
        <FieldDisplay
          lable="Tên chất sát khuẩn"
          value={formatText(data.disinfectant_name)}
        />
        <FieldDisplay lable="Mục đích" value={formatText(data.purpose)} />
        <FieldDisplay
          lable="Nguyên liệu gốc"
          value={formatText(data.base_material_name)}
        />
        <FieldDisplay
          lable="Hàm lượng nguyên liệu gốc (%)"
          value={formatPercent(data.base_material_content)}
        />
        <FieldDisplay
          lable="Thể tích pha chế (lít)"
          value={formatNumber(data.prepared_volume_l)}
        />
        <FieldDisplay
          lable="Lượng nguyên liệu gốc (lít)"
          value={formatNumber(data.base_material_amount_l)}
        />
        <FieldDisplay
          lable="Nồng độ thực tế (%)"
          value={formatPercent(data.actual_concentration)}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Cập nhật lúc"
          value={formatDateTime(data.updated_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
