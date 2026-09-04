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
import type { ProductionOrderTenShellWeightCheck } from "../../types";
import EditTenShellWeightCheck from "../edit-ten-shell-weight-check/edit-ten-shell-weight-check";
import {
  formatDateTime,
  formatText,
  formatWeight,
  getUserLabel,
} from "../../utils";

function TenShellWeightCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-36" />
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

export default function TenShellWeightCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error } = useSWR<ProductionOrderTenShellWeightCheck>(
    API_ROUTES.productionOrders.tenShellWeightCheckDetail(id),
    () => productionOrdersService.fetchTenShellWeightCheckById(id),
  );
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.tenShellWeightCheck(data.production_order_id)
    : null;

  const handleDelete = async () => {
    if (data?.id === null || data?.id === undefined) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteTenShellWeightCheck(data.id);
      toast.success("Đã xóa khối lượng 10 vỏ.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa khối lượng 10 vỏ.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Khối lượng 10 vỏ" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi khối lượng 10 vỏ.
        </div>
      </div>
    );
  }

  if (!data) {
    return <TenShellWeightCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Khối lượng 10 vỏ #${data.id}`}
        subtitle={formatDateTime(data.updated_at ?? data.created_at)}
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
              onClick={() => setIsDeleteConfirmOpen(true)}
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
              Cập nhật khối lượng 10 vỏ
            </DialogTitle>
          </DialogHeader>
          <EditTenShellWeightCheck
            data={data}
            onCancel={() => setIsEditing(false)}
            onSaved={() => {
              setIsEditing(false);
            }}
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
            <DialogTitle>Xác nhận xóa khối lượng 10 vỏ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Bạn có chắc chắn muốn xóa bản ghi khối lượng 10 vỏ này không?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isDeleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={formatText(data.production_order_id)}
        />
        <FieldDisplay
          lable="Khối lượng 10 vỏ"
          value={`${formatWeight(data.ten_shells_weight)} ${data.unit ?? "mg"}`}
        />
        <FieldDisplay
          lable="Thời điểm tạo"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay
          lable="Cập nhật"
          value={formatDateTime(data.updated_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
