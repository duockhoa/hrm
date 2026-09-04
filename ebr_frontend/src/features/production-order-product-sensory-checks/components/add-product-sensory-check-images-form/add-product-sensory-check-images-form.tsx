"use client";

import * as React from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import productionOrdersService from "@/services/product-orders.service";

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

export default function AddProductSensoryCheckImagesForm({
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const addImages = (files: FileList | null) => {
    const selectedImages = Array.from(files ?? []);

    if (selectedImages.length === 0) return;

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
      toast.error(`Mỗi lần kiểm tra có tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    setImages(nextImages);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (images.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ảnh.");
      return;
    }

    try {
      setIsSubmitting(true);
      await productionOrdersService.addProductSensoryCheckImages(checkId, images);
      toast.success("Đã thêm ảnh kiểm tra cảm quan sản phẩm.");
      setImages([]);
      await onSaved();
      onClose?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể thêm ảnh kiểm tra."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-center text-xl font-semibold uppercase">
        Thêm ảnh kiểm tra cảm quan sản phẩm
      </p>
      <div className="space-y-2">
        <Label>Ảnh kiểm tra</Label>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={isSubmitting}
          onChange={(event) => {
            addImages(event.target.files);
            event.target.value = "";
          }}
        />
        <Input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="sr-only"
          disabled={isSubmitting}
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
            <ImageUp className="size-4" /> Chọn ảnh
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="size-4" /> Chụp ảnh
          </Button>
        </div>
        {images.length > 0 ? (
          <ul className="space-y-1 rounded border bg-gray-50 p-2 text-sm">
            {images.map((image, index) => (
              <li
                key={`${image.name}-${image.lastModified}-${index}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{image.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isSubmitting}
                  aria-label={`Bỏ ảnh ${image.name}`}
                  onClick={() =>
                    setImages((currentImages) =>
                      currentImages.filter((_, imageIndex) => imageIndex !== index),
                    )
                  }
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
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
