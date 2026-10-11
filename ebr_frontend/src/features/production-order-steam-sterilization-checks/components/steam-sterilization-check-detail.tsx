"use client";

import useSWR, { mutate } from "swr";
import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DetailPanelHeader from "@/components/detail-panel-header/detail-panel-header";
import { Button } from "@/components/ui/button";
import SteamSterilizationImagePicker from "./steam-sterilization-image-picker";
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

const imageFields = [
  {
    name: "configuration_image",
    path: "configuration_image_path",
    label: "Ảnh cấu hình",
  },
  {
    name: "indicator_image",
    path: "indicator_image_path",
    label: "Ảnh chỉ thị",
  },
  {
    name: "reached_temperature_image",
    path: "reached_temperature_image_path",
    label: "Ảnh đạt nhiệt",
  },
] as const;

type ImageFieldName = (typeof imageFields)[number]["name"];

export default function SteamSterilizationCheckDetail({
  id,
  onClose,
}: {
  id: string | number;
  onClose: () => void;
}) {
  const [uploadingField, setUploadingField] = useState<ImageFieldName | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const uploadInProgressRef = useRef(false);
  const [pendingImages, setPendingImages] = useState<
    Record<ImageFieldName, File | null>
  >({
    configuration_image: null,
    indicator_image: null,
    reached_temperature_image: null,
  });
  const detailKey =
    API_ROUTES.productionOrders.steamSterilizationCheckDetail(id);
  const { data, error } = useSWR<SteamSterilizationCheck>(detailKey, () =>
    productionOrdersService.fetchSteamSterilizationCheckById(id),
  );

  const handleSaveImage = async (fieldName: ImageFieldName) => {
    const file = pendingImages[fieldName];
    if (!file || uploadInProgressRef.current || isDeleting) return;

    const payload = new FormData();
    payload.append(fieldName, file);

    try {
      uploadInProgressRef.current = true;
      setUploadingField(fieldName);
      const saved: SteamSterilizationCheck =
        await productionOrdersService.updateSteamSterilizationCheck(
          id,
          payload,
        );
      await mutate(detailKey, saved, { revalidate: false });
      setPendingImages((current) => ({ ...current, [fieldName]: null }));
      if (data?.production_order_id) {
        void mutate(
          API_ROUTES.productionOrders.steamSterilizationChecks(
            data.production_order_id,
          ),
        ).catch(() => undefined);
      }
      toast.success("Đã lưu ảnh tiệt trùng.");
    } catch (uploadError: any) {
      toast.error(
        uploadError?.response?.data?.message ?? "Không thể lưu ảnh tiệt trùng.",
      );
    } finally {
      uploadInProgressRef.current = false;
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
        showCloseButton={uploadingField === null && !isDeleting}
      />
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
          <div className="space-y-4">
            {imageFields.map((image) => (
              <div key={image.name} className="space-y-2">
                <SteamSterilizationImagePicker
                  label={image.label}
                  file={pendingImages[image.name]}
                  savedPath={data[image.path]}
                  disabled={uploadingField !== null || isDeleting}
                  onChange={(file) =>
                    setPendingImages((current) => ({
                      ...current,
                      [image.name]: file,
                    }))
                  }
                />
                {pendingImages[image.name] && (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingField !== null || isDeleting}
                      onClick={() =>
                        setPendingImages((current) => ({
                          ...current,
                          [image.name]: null,
                        }))
                      }
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      disabled={uploadingField !== null || isDeleting}
                      onClick={() => void handleSaveImage(image.name)}
                    >
                      {uploadingField === image.name
                        ? "Đang lưu..."
                        : "Lưu ảnh"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
