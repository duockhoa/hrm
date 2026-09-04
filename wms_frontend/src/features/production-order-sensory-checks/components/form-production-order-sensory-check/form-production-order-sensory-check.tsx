"use client";

import * as React from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrdersService from "@/services/product-orders.service";
import type { ProductionOrderSensoryCheck, SensoryCheckPayload } from "../../types";
import { SENSORY_OPTIONS, type SensoryOptionValue } from "../../utils";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

type SensoryFieldValue = "" | SensoryOptionValue;

const toSensoryFieldValue = (
  value: string | null | undefined,
): SensoryFieldValue => {
  if (!value) {
    return "";
  }

  return value as SensoryFieldValue;
};

function SensoryOptionToggle({
  value,
  disabled,
  onChange,
}: {
  value: SensoryFieldValue;
  disabled?: boolean;
  onChange: (value: SensoryFieldValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SENSORY_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const isSamePreviousLot =
          option.value === SENSORY_OPTIONS[0].value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-pressed={isSelected}
            className={
              isSelected
                ? isSamePreviousLot
                  ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                : ""
            }
            onClick={() => onChange(isSelected ? "" : option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export default function FormProductionOrderSensoryCheck({
  productionOrderId,
  data,
  onClose,
  onSaved,
}: {
  productionOrderId: string | number;
  data?: ProductionOrderSensoryCheck | null;
  onClose?: () => void;
  onSaved?: (data: ProductionOrderSensoryCheck) => void;
}) {
  const isEditing = Boolean(data?.id);
  const [color, setColor] = React.useState<SensoryFieldValue>(() =>
    toSensoryFieldValue(data?.color),
  );
  const [smell, setSmell] = React.useState<SensoryFieldValue>(() =>
    toSensoryFieldValue(data?.smell),
  );
  const [taste, setTaste] = React.useState<SensoryFieldValue>(() =>
    toSensoryFieldValue(data?.taste),
  );
  const [note, setNote] = React.useState(data?.note ?? "");
  const [images, setImages] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const sensoryChecksKey = productionOrderId
    ? API_ROUTES.productionOrders.sensoryChecks(productionOrderId)
    : null;

  const resetForm = () => {
    setColor(isEditing ? toSensoryFieldValue(data?.color) : "");
    setSmell(isEditing ? toSensoryFieldValue(data?.smell) : "");
    setTaste(isEditing ? toSensoryFieldValue(data?.taste) : "");
    setNote(isEditing ? (data?.note ?? "") : "");
    setImages([]);
  };

  const existingImageCount = data?.images?.length
    ? data.images.length
    : data?.image_path
      ? 1
      : 0;

  const selectImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) {
      return;
    }

    if (selectedImages.some((image) => !ALLOWED_IMAGE_TYPES.has(image.type))) {
      toast.error("Ảnh chỉ nhận JPG, PNG, WEBP hoặc GIF.");
      return;
    }

    const oversizedImage = selectedImages.find(
      (image) => image.size > MAX_IMAGE_SIZE_BYTES,
    );
    if (oversizedImage) {
      toast.error(`Ảnh ${oversizedImage.name} vượt quá dung lượng 20MB.`);
      return;
    }

    const nextImages = [...images, ...selectedImages];
    if (existingImageCount + nextImages.length > MAX_IMAGES) {
      toast.error(`Mỗi lần thử chỉ có tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setImages(nextImages);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productionOrderId) {
      toast.error("Không tìm thấy lệnh sản xuất.");
      return;
    }

    const trimmedNote = note.trim();
    const hasExistingImage = existingImageCount > 0;

    if (
      !color &&
      !smell &&
      !taste &&
      !trimmedNote &&
      images.length === 0 &&
      !hasExistingImage
    ) {
      toast.error("Vui lòng chọn ít nhất màu sắc, mùi, vị, ghi chú hoặc ảnh.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing) {
        if (data?.id === null || data?.id === undefined) {
          toast.error("Không tìm thấy bản ghi thử mùi vị.");
          return;
        }

        const updatePayload: SensoryCheckPayload = {};

        if ((color || null) !== (data.color ?? null)) {
          updatePayload.color = color || null;
        }
        if ((smell || null) !== (data.smell ?? null)) {
          updatePayload.smell = smell || null;
        }
        if ((taste || null) !== (data.taste ?? null)) {
          updatePayload.taste = taste || null;
        }
        if ((trimmedNote || null) !== (data.note ?? null)) {
          updatePayload.note = trimmedNote || null;
        }

        if (images.length === 0 && Object.keys(updatePayload).length === 0) {
          toast.info("Không có thay đổi để cập nhật.");
          return;
        }

        let savedData = data;

        if (Object.keys(updatePayload).length > 0) {
          savedData = await productionOrdersService.updateSensoryCheck(
            data.id,
            updatePayload,
          );
        }

        if (images.length > 0) {
          savedData = await productionOrdersService.addSensoryCheckImages(
            data.id,
            images,
          );
        }

        toast.success("Đã cập nhật thử mùi vị.");
        await mutate(API_ROUTES.productionOrders.sensoryCheckDetail(data.id));
        if (sensoryChecksKey) {
          await mutate(sensoryChecksKey);
        }
        onSaved?.(savedData);
        onClose?.();
        return;
      }

      if (images.length > 0) {
        const formData = new FormData();

        if (color) {
          formData.append("color", color);
        }
        if (smell) {
          formData.append("smell", smell);
        }
        if (taste) {
          formData.append("taste", taste);
        }
        if (trimmedNote) {
          formData.append("note", trimmedNote);
        }
        images.forEach((image) => formData.append("images", image));

        await productionOrdersService.createSensoryCheck(
          productionOrderId,
          formData,
        );
      } else {
        const payload: SensoryCheckPayload = {};

        if (color) {
          payload.color = color;
        }
        if (smell) {
          payload.smell = smell;
        }
        if (taste) {
          payload.taste = taste;
        }
        if (trimmedNote) {
          payload.note = trimmedNote;
        }

        await productionOrdersService.createSensoryCheck(
          productionOrderId,
          payload,
        );
      }

      toast.success("Đã lưu thử mùi vị.");
      resetForm();
      await mutate(sensoryChecksKey);
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể lưu thử mùi vị."),
      );
      console.error("Error creating sensory check:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[420px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[388px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            {isEditing ? "Cập nhật thử mùi vị" : "Thử mùi vị"}
          </p>

          <div className="space-y-2">
            <Label>Màu sắc</Label>
            <SensoryOptionToggle
              value={color}
              disabled={isSubmitting}
              onChange={setColor}
            />
          </div>

          <div className="space-y-2">
            <Label>Mùi</Label>
            <SensoryOptionToggle
              value={smell}
              disabled={isSubmitting}
              onChange={setSmell}
            />
          </div>

          <div className="space-y-2">
            <Label>Vị</Label>
            <SensoryOptionToggle
              value={taste}
              disabled={isSubmitting}
              onChange={setTaste}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sensory-note">Ghi chú</Label>
            <Textarea
              id="sensory-note"
              value={note}
              disabled={isSubmitting}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sensory-image">Ảnh</Label>
            <Input
              ref={fileInputRef}
              id="sensory-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={isSubmitting}
              className="sr-only"
              onChange={(event) => {
                selectImages(event.target.files);
                event.target.value = "";
              }}
            />
            <Input
              ref={cameraInputRef}
              id="capture-sensory-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              disabled={isSubmitting}
              className="sr-only"
              onChange={(event) => {
                selectImages(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  isSubmitting || existingImageCount + images.length >= MAX_IMAGES
                }
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="size-4" />
                Chọn file
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  isSubmitting || existingImageCount + images.length >= MAX_IMAGES
                }
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" />
                Chụp ảnh
              </Button>
            </div>
            {images.length > 0 ? (
              <div className="space-y-2 rounded border bg-gray-50 p-2 text-xs text-gray-600">
                <p className="font-medium text-gray-700">
                  Đã chọn {images.length} ảnh
                </p>
                {images.map((image, index) => (
                  <div
                    key={`${image.name}-${image.lastModified}-${index}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 truncate">{image.name}</span>
                    <button
                      type="button"
                      aria-label={`Bỏ ảnh ${image.name}`}
                      disabled={isSubmitting}
                      className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-red-600"
                      onClick={() =>
                        setImages((currentImages) =>
                          currentImages.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        )
                      }
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-gray-500">
              Tối đa 10 ảnh cho mỗi lần thử, tối đa 20MB/ảnh.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={isEditing ? onClose : resetForm}
          >
            {isEditing ? "Hủy" : "Đặt lại"}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Đang cập nhật..."
                : "Đang lưu..."
              : isEditing
                ? "Cập nhật"
                : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}
