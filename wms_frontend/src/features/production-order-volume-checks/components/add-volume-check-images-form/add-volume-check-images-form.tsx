"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import productionOrdersService from "@/services/product-orders.service";
import VolumeCheckImagePicker from "../volume-check-image-picker";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function AddVolumeCheckImagesForm({
  checkId,
  existingImageCount = 0,
  onClose,
  onSaved,
}: {
  checkId: string | number;
  existingImageCount?: number;
  onClose?: () => void;
  onSaved: () => Promise<void>;
}) {
  const [images, setImages] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (images.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ảnh.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.addVolumeCheckImages(checkId, images);
      toast.success("Đã thêm ảnh kiểm tra thể tích.");
      setImages([]);
      await onSaved();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(error, "Không thể thêm ảnh kiểm tra thể tích."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <VolumeCheckImagePicker
        images={images}
        onChange={setImages}
        disabled={isSubmitting}
        existingImageCount={existingImageCount}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isSubmitting || images.length === 0}>
          {isSubmitting ? "Đang tải..." : "Thêm ảnh"}
        </Button>
      </div>
    </form>
  );
}
