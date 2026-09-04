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
import type {
  PreviousProductionOrder,
  ProductionOrderLineClearanceCheck,
} from "../types";
import {
  formatDateTime,
  formatText,
  getPreviousProductionOrderInfo,
  getUserLabel,
} from "../utils";
import EditLineClearanceCheck from "./edit-line-clearance-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function DetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function LineClearanceCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error } = useSWR<ProductionOrderLineClearanceCheck>(
    API_ROUTES.productionOrders.lineClearanceCheckDetail(id),
    () => productionOrdersService.fetchLineClearanceCheckById(id),
  );
  const { data: productionOrders = [] } = useSWR<PreviousProductionOrder[]>(
    API_ROUTES.productionOrders.base,
    productionOrdersService.fetchProductionOrders,
  );

  const handleDelete = async () => {
    if (data?.id === null || data?.id === undefined) return;
    try {
      setIsDeleting(true);
      await productionOrdersService.deleteLineClearanceCheck(data.id);
      if (data.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.lineClearanceChecks(data.production_order_id),
        );
      }
      toast.success("Đã xóa hạng mục dọn quang dây chuyền.");
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa hạng mục dọn quang dây chuyền."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Dọn quang dây chuyền" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy hạng mục dọn quang dây chuyền.
        </div>
      </div>
    );
  }
  if (!data) return <DetailSkeleton />;

  const previousOrder = getPreviousProductionOrderInfo(data, productionOrders);

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Dọn quang dây chuyền #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
        actions={
          <>
            <Button size="sm" type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" /> Sửa
            </Button>
            <Button
              size="sm"
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" /> Xóa
            </Button>
          </>
        }
        onClose={onClose}
      />

      <Dialog modal={false} open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Cập nhật dọn quang dây chuyền</DialogTitle>
          </DialogHeader>
          <EditLineClearanceCheck
            data={data}
            onCancel={() => setIsEditing(false)}
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
            <DialogTitle>Xác nhận xóa hạng mục dọn quang</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa hạng mục này không? Thao tác này không thể hoàn tác.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setIsDeleteConfirmOpen(false)}>
              Hủy
            </Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay lable="Mã lệnh sản xuất" value={formatText(data.production_order_id)} />
        <FieldDisplay lable="Loại kiểm tra" value={formatText(data.check_type)} />
        <FieldDisplay lable="Yêu cầu" value={formatText(data.requirement)} />
        <FieldDisplay lable="Kết quả" value={formatText(data.result)} />
        <FieldDisplay lable="ID lệnh sản xuất trước" value={formatText(data.previous_production_order_id)} />
        <FieldDisplay
          lable="Tên sản phẩm lô trước"
          value={formatText(previousOrder.productName)}
        />
        <FieldDisplay lable="Số lô trước" value={formatText(previousOrder.lotNo)} />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
        <FieldDisplay lable="Thời điểm tạo" value={formatDateTime(data.created_at)} />
        <FieldDisplay lable="Cập nhật lần cuối" value={formatDateTime(data.updated_at)} />
      </div>
    </div>
  );
}
