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
import type { ProductionOrderSemiFinishedNetWeightCheck } from "../../types";
import EditProductionOrderSemiFinishedNetWeightCheckForm from "../edit-production-order-semi-finished-net-weight-check/edit-production-order-semi-finished-net-weight-check";
import {
  SEMI_FINISHED_NET_WEIGHT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatWeightWithUnit,
  getVialCheckType,
  getUserLabel,
} from "../../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

function SemiFinishedNetWeightCheckDetailSkeleton() {
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mx-auto mt-4 h-10 w-3/4" />
      <div className="my-4 border-t border-gray-300" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 15 }).map((_, index) => (
          <div key={index} className="flex w-full justify-start gap-4">
            <Skeleton className="m-1 h-5 min-w-[150px] max-w-[200px]" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SemiFinishedNetWeightCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const { data, error } = useSWR<ProductionOrderSemiFinishedNetWeightCheck>(
    API_ROUTES.productionOrders.semiFinishedNetWeightCheckDetail(id),
    () => productionOrdersService.fetchSemiFinishedNetWeightCheckById(id),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listKey = data?.production_order_id
    ? API_ROUTES.productionOrders.semiFinishedNetWeightChecks(
        data.production_order_id,
      )
    : null;

  const handleDelete = async () => {
    if (!data?.id) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSemiFinishedNetWeightCheck(data.id);
      toast.success("Đã xóa kiểm tra khối lượng tịnh.");
      if (listKey) {
        await mutateGlobal(listKey);
      }
      onClose();
    } catch (deleteError: any) {
      toast.error(
        getErrorMessage(
          deleteError,
          "Không thể xóa kiểm tra khối lượng tịnh.",
        ),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Kiểm tra khối lượng tịnh" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi kiểm tra khối lượng tịnh.
        </div>
      </div>
    );
  }

  if (!data) {
    return <SemiFinishedNetWeightCheckDetailSkeleton />;
  }

  const vialCheckType = getVialCheckType(data);
  const checkTitle =
    vialCheckType === "vial"
      ? "Kiểm tra khối lượng lọ"
      : vialCheckType === "solution"
        ? "Kiểm tra khối lượng dịch trong lọ"
        : vialCheckType === "tube"
          ? "Kiểm tra khối lượng dịch trong tuýp"
        : "Kiểm tra khối lượng tịnh";
  const unitLabel =
    vialCheckType === "tube" ? "Tuýp" : vialCheckType ? "Lọ" : "Đơn vị";

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`${checkTitle} #${data.id}`}
        subtitle={formatDateTime(data.created_at)}
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
              Cập nhật kiểm tra khối lượng tịnh
            </DialogTitle>
          </DialogHeader>
          <EditProductionOrderSemiFinishedNetWeightCheckForm
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
        <div className="flex w-full justify-start gap-3 md:gap-4">
          <div className="m-0.5 min-w-[120px] max-w-[160px] pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:min-w-[150px] md:max-w-[200px] md:pr-2">
            Yêu cầu
          </div>
          <div className="flex-1 text-left text-gray-800">
            <p className="whitespace-pre-line wrap-anywhere">
              {formatText(data.requirement)}
            </p>
          </div>
        </div>
        <FieldDisplay
          lable="Dạng kiểm tra"
          value={formatDosageFormStage(data.dosage_form_stage)}
        />
        {SEMI_FINISHED_NET_WEIGHT_KEYS.map((key, index) => (
          <FieldDisplay
            key={key}
            lable={`${unitLabel} ${index + 1}`}
            value={formatWeightWithUnit(data[key], data.unit)}
          />
        ))}
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={formatDateTime(data.created_at)}
        />
        <FieldDisplay lable="Người nhập" value={getUserLabel(data.createdBy)} />
      </div>
    </div>
  );
}
