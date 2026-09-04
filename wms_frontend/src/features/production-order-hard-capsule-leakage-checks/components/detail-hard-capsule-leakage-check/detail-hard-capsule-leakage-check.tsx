"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { mutate as mutateGlobal } from "swr";
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
import type { ProductionOrderHardCapsuleLeakageCheck } from "../../types";
import {
  formatDateTime,
  formatLeakageRate,
  formatNumber,
  formatStage,
  formatText,
  getUserLabel,
} from "../../utils";
import EditHardCapsuleLeakageCheckForm from "../edit-hard-capsule-leakage-check/edit-hard-capsule-leakage-check";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function HardCapsuleLeakageCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[220px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HardCapsuleLeakageCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderHardCapsuleLeakageCheck>(
    API_ROUTES.productionOrders.hardCapsuleLeakageCheckDetail(id),
    () => productionOrdersService.fetchHardCapsuleLeakageCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.hardCapsuleLeakageChecks(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteHardCapsuleLeakageCheck(data.id);
      toast.success("Đã xóa kiểm tra độ rò rỉ viên nang cứng.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(
          deleteError,
          "Không thể xóa kiểm tra độ rò rỉ viên nang cứng.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader
          title="Độ rò rỉ viên nang cứng"
          onClose={onClose}
        />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy phiếu kiểm tra độ rò rỉ viên nang cứng.
        </div>
      </div>
    );
  }

  if (!data) {
    return <HardCapsuleLeakageCheckDetailSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Độ rò rỉ viên nang cứng #${data.id}`}
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
              Cập nhật kiểm tra độ rò rỉ viên nang cứng
            </DialogTitle>
          </DialogHeader>
          <EditHardCapsuleLeakageCheckForm
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
        <FieldDisplay lable="Công đoạn" value={formatStage(data.stage)} />
        <FieldDisplay
          lable="Số viên nang cứng kiểm tra"
          value={formatNumber(data.tested_capsule_count)}
        />
        <FieldDisplay
          lable="Số viên nang cứng bị rò rỉ"
          value={formatNumber(data.leaked_capsule_count)}
        />
        <FieldDisplay
          lable="Tỉ lệ rò rỉ"
          value={formatLeakageRate(
            data.tested_capsule_count,
            data.leaked_capsule_count,
          )}
        />
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.checked_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
