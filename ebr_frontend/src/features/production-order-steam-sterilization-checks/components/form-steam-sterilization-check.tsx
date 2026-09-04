"use client";

import { FormEvent, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import userService from "@/services/user.service";
import {
  QrInputButton,
  QrScanDialog,
} from "@/components/qr-scan-dialog/qr-scan-dialog";

const equipmentQrKeys = [
  "equipment_name",
  "equipment",
  "device_name",
  "device",
  "ten_thiet_bi",
];

const parseEquipmentQr = (decodedText: string) => {
  const text = decodedText.trim();

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    for (const key of equipmentQrKeys) {
      const entry = Object.entries(data).find(
        ([sourceKey]) => sourceKey.toLowerCase() === key,
      );
      if (entry?.[1] !== undefined && entry[1] !== null) {
        return String(entry[1]).trim();
      }
    }
  } catch {
    // QR may contain plain text.
  }

  return text;
};

export default function FormSteamSterilizationCheck({
  productionOrderId,
  onClose,
}: {
  productionOrderId: string | number;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [equipmentName, setEquipmentName] = useState("");
  const [configurationImage, setConfigurationImage] = useState<File | null>(
    null,
  );
  const [isEquipmentScannerOpen, setIsEquipmentScannerOpen] = useState(false);
  const configurationFileInputRef = useRef<HTMLInputElement>(null);
  const configurationCameraInputRef = useRef<HTMLInputElement>(null);
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useSWR(
    API_ROUTES.users.me,
    userService.fetcherMe,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = new FormData(form);
    const payload = new FormData();

    if (!currentUser?.id) {
      toast.error("Không tìm thấy thông tin người dùng hiện tại.");
      return;
    }

    for (const [key, value] of raw.entries()) {
      if (value instanceof File ? value.size > 0 : String(value).trim() !== "") {
        payload.append(key, value);
      }
    }
    if (configurationImage) {
      payload.set("configuration_image", configurationImage);
    }
    payload.set("checked_by_id", String(currentUser.id));
    payload.set("checked_at", new Date().toISOString());

    try {
      setIsSubmitting(true);
      await productionOrdersService.createSteamSterilizationCheck(
        productionOrderId,
        payload,
      );
      await mutate(
        API_ROUTES.productionOrders.steamSterilizationChecks(productionOrderId),
      );
      toast.success("Đã thêm dữ liệu tiệt trùng.");
      form.reset();
      setEquipmentName("");
      setConfigurationImage(null);
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ?? "Không thể thêm dữ liệu tiệt trùng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="equipment_name">Tên thiết bị</Label>
        <div className="relative">
          <Input
            id="equipment_name"
            name="equipment_name"
            value={equipmentName}
            onChange={(event) => setEquipmentName(event.target.value)}
            className="pr-11"
            disabled={isSubmitting}
          />
          <QrInputButton
            disabled={isSubmitting}
            onClick={() => setIsEquipmentScannerOpen(true)}
          />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="setting_temperature">Nhiệt độ cài đặt (°C)</Label>
          <Input id="setting_temperature" name="setting_temperature" type="number" min="0.01" max="999999.99" step="0.01" disabled={isSubmitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setting_time">Thời gian cài đặt (phút)</Label>
          <Input id="setting_time" name="setting_time" type="number" min="1" step="1" disabled={isSubmitting} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Ảnh cấu hình hấp</Label>
        <Input
          ref={configurationFileInputRef}
          id="configuration_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={isSubmitting}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
              toast.error("Ảnh cấu hình hấp phải có dung lượng không quá 20 MB.");
              return;
            }
            setConfigurationImage(file);
          }}
        />
        <Input
          ref={configurationCameraInputRef}
          id="configuration_image_camera"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          disabled={isSubmitting}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
              toast.error("Ảnh cấu hình hấp phải có dung lượng không quá 20 MB.");
              return;
            }
            setConfigurationImage(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => configurationFileInputRef.current?.click()}
          >
            <ImageUp className="size-4" />
            Chọn file
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => configurationCameraInputRef.current?.click()}
          >
            <Camera className="size-4" />
            Chụp ảnh
          </Button>
        </div>
        {configurationImage ? (
          <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
            <p className="font-medium text-gray-700">
              Đã chọn: {configurationImage.name}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
        <Button type="submit" disabled={isSubmitting || isLoadingCurrentUser}>{isSubmitting ? "Đang lưu..." : "Lưu"}</Button>
      </div>
      <QrScanDialog
        open={isEquipmentScannerOpen}
        title="Quét QR thiết bị"
        onOpenChange={setIsEquipmentScannerOpen}
        onScan={(decodedText) => {
          const value = parseEquipmentQr(decodedText);
          if (!value) {
            toast.error("Không đọc được tên thiết bị từ mã QR.");
            return;
          }
          setEquipmentName(value);
          toast.success("Đã điền tên thiết bị từ mã QR.");
        }}
      />
    </form>
  );
}
