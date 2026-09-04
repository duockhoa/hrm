"use client";

import * as React from "react";
import { Camera, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import productionOrdersService from "@/services/product-orders.service";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function AddDateCheckImagesForm({
  checkId,
  onSaved,
  onClose,
}: {
  checkId: string | number;
  onSaved: () => Promise<void>;
  onClose?: () => void;
}) {
  const [images, setImages] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const addImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) {
      return;
    }

    setImages((currentImages) => {
      const nextImages = [...currentImages, ...selectedImages];

      if (nextImages.length > 10) {
        toast.error("Tối đa 10 ảnh cho mỗi lần thêm.");
        return nextImages.slice(0, 10);
      }

      return nextImages;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (images.length === 0) {
      toast.error("Vui lòng chọn ảnh.");
      return;
    }

    if (images.length > 10) {
      toast.error("Tối đa 10 ảnh cho mỗi lần thêm.");
      return;
    }

    const formData = new FormData();
    images.forEach((image) => formData.append("images", image));

    try {
      setIsSubmitting(true);
      await productionOrdersService.addDateCheckImages(checkId, formData);
      toast.success("Đã thêm ảnh kiểm tra date.");
      setImages([]);
      await onSaved();
      onClose?.();
    } catch (imageError: any) {
      toast.error(getErrorMessage(imageError, "Không thể thêm ảnh."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100%] min-h-[220px] rounded-md bg-white p-4 shadow-md">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-[188px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <p className="text-center text-xl font-semibold uppercase text-gray-900">
            Thêm ảnh kiểm tra date
          </p>

          <div className="space-y-2">
            <Label htmlFor="add-date-check-images">Ảnh kiểm tra</Label>
            <Input
              ref={fileInputRef}
              id="add-date-check-images"
              type="file"
              accept="image/*"
              multiple
              disabled={isSubmitting}
              className="sr-only"
              onChange={(event) => {
                addImages(event.target.files);
                event.target.value = "";
              }}
            />
            <Input
              ref={cameraInputRef}
              id="capture-date-check-image"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isSubmitting}
              className="sr-only"
              onChange={(event) => {
                addImages(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="size-4" />
                Chọn file
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" />
                Chụp ảnh
              </Button>
            </div>
            {images.length > 0 ? (
              <div className="rounded border bg-gray-50 p-2 text-xs text-gray-600">
                <p className="font-medium text-gray-700">
                  Đã chọn {images.length} ảnh
                </p>
              </div>
            ) : null}
            <p className="text-xs text-gray-500">Tối đa 10 ảnh.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setImages([])}
          >
            Đặt lại
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </div>
  );
}
