"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import useSWR, { useSWRConfig } from "swr";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import FieldDisplay from "@/components/field-display/field-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import warehouseTemperatureHumidityChecksService, {
  WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL,
  type WarehouseTemperatureHumidityCheck,
} from "@/services/warehouse-temperature-humidity-checks.service";
import CheckForm, { checkError } from "./check-form";

export const formatCheckDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export const formatCheckResult = (value: boolean | null) =>
  value === true ? "Đạt" : value === false ? "Không đạt" : "Chưa đánh giá";

export default function CheckDetail({
  id,
  onClose,
  externalActionsContainer,
}: {
  id: number;
  onClose: () => void;
  externalActionsContainer: HTMLDivElement | null;
}) {
  const { data, error, mutate } = useSWR(
    `${WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL}/${id}`,
    () => warehouseTemperatureHumidityChecksService.read(id),
  );
  const { mutate: mutateGlobal } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setDeleteError("");
      await warehouseTemperatureHumidityChecksService.delete(id);
      toast.success("Đã xóa kiểm tra nhiệt độ, độ ẩm kho.");
      await mutateGlobal(
        WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL,
        (list: WarehouseTemperatureHumidityCheck[] | undefined) =>
          (list ?? []).filter((entry) => entry.id !== id),
        { revalidate: true },
      );
      onClose();
    } catch (error) {
      setDeleteError(
        checkError(error, "Không thể xóa kiểm tra nhiệt độ, độ ẩm kho."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (error)
    return (
      <div
        role="alert"
        className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {checkError(
          error,
          "Không thể tải chi tiết kiểm tra nhiệt độ, độ ẩm kho.",
        )}
      </div>
    );
  if (!data)
    return (
      <div className="space-y-4 rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );

  const actions = (
    <>
      <Button size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Sửa
      </Button>
      <Button
        size="sm"
        disabled={isDeleting}
        onClick={() => {
          setDeleteError("");
          setDeleting(true);
        }}
        className="bg-black text-white hover:bg-gray-800"
      >
        <Trash2 className="size-4" /> Xóa
      </Button>
    </>
  );
  const fields = [
    ["Vị trí", data.location],
    ["Yêu cầu", data.requirement],
    ["Nhiệt độ (°C)", data.temperature],
    ["Độ ẩm (%RH)", data.humidity],
    ["Kết quả", formatCheckResult(data.is_passed)],
    ["Thời điểm kiểm tra", formatCheckDateTime(data.created_at)],
    ["Người kiểm tra", data.checkedBy?.name || data.checkedBy?.username],
    ["Ngày cập nhật", formatCheckDateTime(data.updated_at)],
  ];
  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      {externalActionsContainer &&
        createPortal(actions, externalActionsContainer)}
      <DetailPanelHeader
        title={`Kiểm tra nhiệt độ, độ ẩm kho #${data.id}`}
        subtitle={formatCheckDateTime(data.created_at)}
        onClose={onClose}
        showCloseButton={false}
      />
      <div className="mt-4 flex flex-col gap-4 text-left [&_p]:whitespace-pre-wrap">
        {fields.map(([label, value]) => (
          <FieldDisplay key={label} lable={label ?? ""} value={value ?? ""} />
        ))}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Sửa kiểm tra nhiệt độ, độ ẩm kho</DialogTitle>
          </DialogHeader>
          <CheckForm
            data={data}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              void mutate(saved, { revalidate: false });
              void mutateGlobal(WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL);
              setEditing(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleting(open);
        }}
      >
        <DialogContent className="md:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa kiểm tra nhiệt độ, độ ẩm kho</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa bản ghi kiểm tra nhiệt độ, độ ẩm kho #
            {data.id} không?
          </p>
          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleting(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={isDeleting}
              onClick={handleDelete}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
