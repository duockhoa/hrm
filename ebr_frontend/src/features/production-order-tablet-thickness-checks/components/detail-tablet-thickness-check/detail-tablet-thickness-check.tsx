"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as mutateGlobal } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderTabletThicknessCheck } from "../../types";
import {
  TABLET_THICKNESS_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatThicknessWithUnit,
  getUserLabel,
} from "../../utils";
import EditTabletThicknessCheck from "../edit-tablet-thickness-check/edit-tablet-thickness-check";

export default function TabletThicknessCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderTabletThicknessCheck>(
    API_ROUTES.productionOrders.tabletThicknessCheckDetail(id),
    () => productionOrdersService.fetchTabletThicknessCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!data?.id) return;
    try {
      setIsDeleting(true);
      await productionOrdersService.deleteTabletThicknessCheck(data.id);
      toast.success("Đã xóa kiểm tra độ dày viên nén.");
      if (data.production_order_id) {
        await mutateGlobal(
          API_ROUTES.productionOrders.tabletThicknessChecks(data.production_order_id),
        );
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          deleteError?.message ??
          "Không thể xóa kiểm tra độ dày viên nén.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra độ dày viên nén" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra độ dày viên nén.
        </div>
      </div>
    );
  }

  if (!data) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra độ dày viên nén #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button type="button" size="sm" disabled={isDeleting} onClick={handleDelete}>
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />
      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="md:max-w-[600px]">
          <DialogHeader><DialogTitle className="sr-only">Cập nhật kiểm tra độ dày viên nén</DialogTitle></DialogHeader>
          <EditTabletThicknessCheck data={data} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
        </DialogContent>
      </Dialog>
      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay lable="Mã lệnh sản xuất" value={formatText(data.production_order_id)} />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        <FieldDisplay lable="Dạng kiểm tra" value={formatDosageFormStage(data.dosage_form_stage)} />
        {TABLET_THICKNESS_KEYS.map((key, index) => (
          <FieldDisplay key={key} lable={`Viên ${index + 1}`} value={formatThicknessWithUnit(data[key], data.unit)} />
        ))}
        <FieldDisplay lable="Thời điểm kiểm tra" value={formatDateTime(data.created_at)} />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
