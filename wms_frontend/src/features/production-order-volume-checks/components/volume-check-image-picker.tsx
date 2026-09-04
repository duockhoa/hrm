"use client";

import * as React from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default function VolumeCheckImagePicker({
  images,
  onChange,
  disabled = false,
  existingImageCount = 0,
}: {
  images: File[];
  onChange: (images: File[]) => void;
  disabled?: boolean;
  existingImageCount?: number;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();

  const addImages = (files: FileList | null) => {
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
      toast.error(`Ảnh ${oversizedImage.name} vượt quá dung lượng 20 MB.`);
      return;
    }

    const nextImages = [...images, ...selectedImages];
    if (existingImageCount + nextImages.length > MAX_IMAGES) {
      toast.error(`Mỗi lần kiểm tra có tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }

    onChange(nextImages);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${inputId}-files`}>Ảnh kiểm tra</Label>
      <Input
        ref={fileInputRef}
        id={`${inputId}-files`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        id={`${inputId}-camera`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="size-4" /> Chọn ảnh
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
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
                disabled={disabled}
                aria-label={`Bỏ ảnh ${image.name}`}
                onClick={() =>
                  onChange(
                    images.filter((_, imageIndex) => imageIndex !== index),
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
  );
}
