"use client";

import useSWR, { mutate } from "swr";
import { ChangeEvent, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import SharedAuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";

type User = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type SteamSterilizationCheck = {
  id: string | number;
  production_order_id?: string | number | null;
  equipment_name?: string | null;
  setting_temperature?: string | number | null;
  setting_time?: number | null;
  checked_at?: string | null;
  configuration_image_path?: string | null;
  indicator_image_path?: string | null;
  reached_temperature_image_path?: string | null;
  createdBy?: User | null;
  checkedBy?: User | null;
};

const text = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const userLabel = (user?: User | null) =>
  user?.name ?? user?.username ?? user?.email ?? "—";

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const imageCaptureFields = [
  { name: "configuration_image", label: "Chụp ảnh cấu hình" },
  { name: "indicator_image", label: "Chụp ảnh chỉ thị" },
  {
    name: "reached_temperature_image",
    label: "Chụp ảnh đạt nhiệt",
  },
] as const;

const imageDisplayFields = [
  { path: "configuration_image_path", label: "Ảnh cấu hình" },
  { path: "indicator_image_path", label: "Ảnh chỉ thị" },
  { path: "reached_temperature_image_path", label: "Ảnh đạt nhiệt" },
] as const;

function AuthenticatedImage({ path, label }: { path: string; label: string }) {
  return (
    <SharedAuthenticatedImage
      src={path}
      alt={label}
      className="h-48 w-full rounded-none border-0"
      height={192}
      width={320}
      loading="lazy"
      objectFit="contain"
    />
  );
}

export default function SteamSterilizationCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const detailKey =
    API_ROUTES.productionOrders.steamSterilizationCheckDetail(id);
  const { data, error } = useSWR<SteamSterilizationCheck>(detailKey, () =>
    productionOrdersService.fetchSteamSterilizationCheckById(id),
  );

  const handleCapture = async (
    fieldName: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ảnh phải có dung lượng không quá 20 MB.");
      return;
    }

    const payload = new FormData();
    payload.append(fieldName, file);

    try {
      setUploadingField(fieldName);
      await productionOrdersService.updateSteamSterilizationCheck(id, payload);
      await mutate(detailKey);
      if (data?.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.steamSterilizationChecks(
            data.production_order_id,
          ),
        );
      }
      toast.success("Đã lưu ảnh tiệt trùng.");
    } catch (uploadError: any) {
      toast.error(
        uploadError?.response?.data?.message ?? "Không thể lưu ảnh tiệt trùng.",
      );
    } finally {
      setUploadingField(null);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm("Bạn có chắc muốn xóa phiếu kiểm tra tiệt trùng này?")
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await productionOrdersService.deleteSteamSterilizationCheck(id);
      if (data?.production_order_id) {
        await mutate(
          API_ROUTES.productionOrders.steamSterilizationChecks(
            data.production_order_id,
          ),
        );
      }
      toast.success("Đã xóa phiếu kiểm tra tiệt trùng.");
      onClose();
    } catch (deleteError: any) {
      toast.error(
        deleteError?.response?.data?.message ??
          "Không thể xóa phiếu kiểm tra tiệt trùng.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <DetailPanelHeader title="Chi tiết tiệt trùng" onClose={onClose} />
        <div className="mt-4 rounded border border-dashed p-6 text-center text-sm text-gray-500">
          Không tìm thấy bản ghi tiệt trùng.
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-4xl space-y-3 rounded border bg-white p-4 shadow-md">
        <Skeleton className="h-9 w-56" />
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl rounded border bg-white p-4 text-center shadow-md">
      <DetailPanelHeader
        title={`Chi tiết tiệt trùng #${data.id}`}
        subtitle={dateTime(data.checked_at)}
        actions={
          <button
            type="button"
            title="Xóa phiếu"
            aria-label="Xóa phiếu kiểm tra tiệt trùng"
            disabled={isDeleting || uploadingField !== null}
            onClick={() => void handleDelete()}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="size-4" />
                <span>Xóa</span>
              </>
            )}
          </button>
        }
        onClose={onClose}
      />
      <div className="border-b py-3">
        <div className="flex flex-wrap justify-start gap-2">
          {imageCaptureFields.map((field) => (
            <div
              key={field.name}
              className="inline-flex flex-col items-center p-0.5 md:p-1"
            >
              <input
                ref={(element) => {
                  inputRefs.current[field.name] = element;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                className="hidden"
                onChange={(event) => void handleCapture(field.name, event)}
              />
              <button
                type="button"
                title={field.label}
                className="flex h-9 w-9 items-center justify-center rounded-[9999px] bg-blue-500 px-3 py-2 text-center text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-4 [&_svg]:min-h-5 [&_svg]:min-w-5"
                disabled={uploadingField !== null}
                onClick={() => inputRefs.current[field.name]?.click()}
              >
                {uploadingField === field.name ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <div className="w-[82px] md:w-[90px]">
                <p className="mt-1 text-center text-[13px] font-semibold leading-tight text-gray-700 md:text-[14px]">
                  {uploadingField === field.name ? "Đang tải..." : field.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mã lệnh sản xuất"
          value={text(data.production_order_id)}
        />
        <FieldDisplay lable="Tên thiết bị" value={text(data.equipment_name)} />
        <FieldDisplay
          lable="Nhiệt độ cài đặt (°C)"
          value={text(data.setting_temperature)}
        />
        <FieldDisplay
          lable="Thời gian cài đặt (phút)"
          value={text(data.setting_time)}
        />
        <FieldDisplay
          lable="Thời điểm kiểm tra"
          value={dateTime(data.checked_at)}
        />
        <FieldDisplay lable="Người nhập" value={userLabel(data.createdBy)} />
        <div className="border-t pt-4 text-left">
          <h2 className="mb-3 text-lg font-semibold">Hình ảnh tiệt trùng</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {imageDisplayFields.map((image) => {
              const imagePath = data[image.path];
              return (
                <div
                  key={image.path}
                  className="overflow-hidden rounded border bg-gray-50"
                >
                  <p className="border-b bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                    {image.label}
                  </p>
                  {imagePath ? (
                    <AuthenticatedImage path={imagePath} label={image.label} />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                      Chưa có ảnh
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
