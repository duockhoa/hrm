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
import type { ProductionOrderHygieneCheck } from "../../types";
import { formatDateTime, formatText, getUserLabel } from "../../utils";
import EditHygieneCheck from "../edit-hygiene-check/edit-hygiene-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function HygieneCheckDetailSkeleton() {
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

export default function HygieneCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderHygieneCheck>(
    API_ROUTES.productionOrders.hygieneCheckDetail(id),
    () => productionOrdersService.fetchHygieneCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.hygieneChecks(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (data?.id === undefined || data.id === null) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteHygieneCheck(data.id);
      toast.success("Đã xóa kiểm tra vệ sinh.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa kiểm tra vệ sinh."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra vệ sinh" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra vệ sinh.
        </div>
      </div>
    );
  }

  if (!data) {
    return <HygieneCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra vệ sinh #${data.id}`}
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
            <DialogTitle className="sr-only">
              Cập nhật kiểm tra vệ sinh
            </DialogTitle>
          </DialogHeader>
          <EditHygieneCheck
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
          lable="Phòng/thiết bị"
          value={formatText(data.room_or_equipment)}
        />
        <FieldDisplay
          lable="Loại vệ sinh"
          value={formatText(data.cleaning_type)}
        />
        <FieldDisplay lable="Kết quả" value={formatText(data.result)} />
        <FieldDisplay lable="Ghi chú" value={formatText(data.note)} />
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
