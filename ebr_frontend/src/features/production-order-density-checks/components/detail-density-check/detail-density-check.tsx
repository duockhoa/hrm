"use client";

import useSWR from "swr";
import { mutate as mutateGlobal } from "swr";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import EditDensityCheck from "../edit-density-check/edit-density-check";

type DensityCheckUser = {
  username?: string | null;
  name?: string | null;
  email?: string | null;
};

type DensityCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  empty_pycnometer_mass_g?: number | string | null;
  solution_pycnometer_mass_g?: number | string | null;
  water_pycnometer_mass_g?: number | string | null;
  density?: number | string | null;
  apparent_density?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: DensityCheckUser | null;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDecimal = (
  value: string | number | null | undefined,
  fractionDigits = 4,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

function DensityCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
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

export default function DensityCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<DensityCheck>(
    API_ROUTES.productionOrders.densityCheckDetail(id),
    () => productionOrdersService.fetchDensityCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.densityChecks(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) return;
    try {
      setIsDeleting(true);
      await productionOrdersService.deleteDensityCheck(data.id);
      toast.success("Đã xóa kiểm tra tỉ trọng.");
      if (listKey) await mutateGlobal(listKey);
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ?? "Không thể xóa kiểm tra tỉ trọng.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Tỉ trọng" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi tỉ trọng.
        </div>
      </div>
    );
  }

  if (!data) {
    return <DensityCheckDetailSkeleton />;
  }

  const createdBy = data.createdBy;
  const userLabel =
    createdBy?.name ?? createdBy?.username ?? createdBy?.email ?? "";

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Tỉ trọng #${data.id}`}
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
            <DialogTitle className="sr-only">Cập nhật kiểm tra tỉ trọng</DialogTitle>
          </DialogHeader>
          <EditDensityCheck
            data={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Khối lượng bình rỗng (g)"
          value={formatDecimal(data.empty_pycnometer_mass_g)}
        />
        <FieldDisplay
          lable="Khối lượng bình chứa dung dịch (g)"
          value={formatDecimal(data.solution_pycnometer_mass_g)}
        />
        <FieldDisplay
          lable="Khối lượng bình chứa nước (g)"
          value={formatDecimal(data.water_pycnometer_mass_g)}
        />
        <FieldDisplay lable="Tỉ trọng" value={formatDecimal(data.density, 4)} />
        <FieldDisplay
          lable="Tỉ trọng biểu kiến (g/ml)"
          value={formatDecimal(data.apparent_density, 4)}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={userLabel} />
      </div>
    </div>
  );
}
