"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderSecondaryPackagingCheck } from "../types";
import { formatDateTime, formatQuantity, formatText, getUserLabel } from "../utils";
import EditSecondaryPackagingCheck from "./edit-secondary-packaging-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function DetailSkeleton() {
  return <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md"><Skeleton className="h-9 w-56" /><div className="mt-6 space-y-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-6 w-full" />)}</div></div>;
}

export default function SecondaryPackagingCheckDetail({ id, onClose }: { id: string | number; onClose: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error } = useSWR<ProductionOrderSecondaryPackagingCheck>(
    API_ROUTES.productionOrders.secondaryPackagingCheckDetail(id),
    () => productionOrdersService.fetchSecondaryPackagingCheckById(id),
  );

  const handleDelete = async () => {
    if (data?.id === null || data?.id === undefined) return;
    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSecondaryPackagingCheck(data.id);
      if (data.production_order_id) {
        await mutate(API_ROUTES.productionOrders.secondaryPackagingChecks(data.production_order_id));
      }
      toast.success("Đã xóa kiểm tra đóng gói bao bì cấp 2.");
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (deleteError: any) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa kiểm tra đóng gói bao bì cấp 2."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md"><DetailPanelHeader title="Kiểm tra bao bì cấp 2" onClose={onClose} /><div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">Không tìm thấy hạng mục kiểm tra.</div></div>;
  }
  if (!data) return <DetailSkeleton />;

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Kiểm tra bao bì cấp 2 #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={<><Button size="sm" type="button" onClick={() => setIsEditing(true)}><Pencil className="size-4" /> Sửa</Button><Button size="sm" type="button" variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}><Trash2 className="size-4" /> Xóa</Button></>}
        onClose={onClose}
      />
      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[600px]">
          <DialogHeader><DialogTitle className="sr-only">Cập nhật kiểm tra bao bì cấp 2</DialogTitle></DialogHeader>
          <EditSecondaryPackagingCheck data={data} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
        </DialogContent>
      </Dialog>
      <Dialog modal={false} open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader><DialogTitle>Xác nhận xóa hạng mục kiểm tra</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Bạn có chắc chắn muốn xóa hạng mục này không? Thao tác này không thể hoàn tác.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={isDeleting} onClick={() => setIsDeleteConfirmOpen(false)}>Hủy</Button><Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>{isDeleting ? "Đang xóa..." : "Xóa"}</Button></div>
        </DialogContent>
      </Dialog>
      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay lable="Mã lệnh sản xuất" value={formatText(data.production_order_id)} />
        <FieldDisplay lable="Công đoạn" value={formatText(data.stage)} />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        <FieldDisplay lable="Số lượng kiểm tra" value={formatQuantity(data.quantity_checked)} />
        <FieldDisplay lable="Số lượng đạt" value={formatQuantity(data.quantity_passed)} />
        <FieldDisplay lable="Người kiểm tra" value={getUserLabel(data.checkedBy ?? data.createdBy)} />
        <FieldDisplay lable="Thời điểm tạo" value={formatDateTime(data.created_at)} />
        <FieldDisplay lable="Cập nhật lần cuối" value={formatDateTime(data.updated_at)} />
      </div>
    </div>
  );
}
