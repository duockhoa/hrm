"use client";

import { useEffect, useMemo, useRef } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_RECEIPT_IMAGES_PER_UPLOAD,
  RECEIPT_IMAGE_ACCEPT,
  validateReceiptImages,
  type ReceiptAttachment,
} from "./receipt-attachments";

function SelectedImage({ file }: { file: File }) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);
  return (
    <AuthenticatedImage
      src={src}
      alt={file.name}
      width={240}
      height={160}
      className="h-28 w-full rounded-none border-0"
      loading="eager"
    />
  );
}

export function ReceiptImageGallery({
  images,
  disabled = false,
  onRemove,
}: {
  images: ReceiptAttachment[];
  disabled?: boolean;
  onRemove?: (id: number) => void;
}) {
  if (!images.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative overflow-hidden rounded border bg-gray-50"
        >
          <AuthenticatedImage
            src={`${image.file_path}?thumbnail=true`}
            alt={image.original_name}
            width={240}
            height={160}
            className="h-28 w-full rounded-none border-0"
          />
          {onRemove && (
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute right-1 top-1"
              disabled={disabled}
              aria-label={`Bỏ ảnh ${image.original_name}`}
              onClick={() => onRemove(image.id)}
            >
              <X className="size-4" />
            </Button>
          )}
          <p className="truncate px-2 py-1 text-xs" title={image.original_name}>
            {image.original_name}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ReceiptImagePicker({
  label,
  files,
  images,
  disabled,
  onChange,
  onRemove,
}: {
  label: string;
  files: File[];
  images: ReceiptAttachment[];
  disabled: boolean;
  onChange: (files: File[]) => void;
  onRemove: (id: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const full = files.length >= MAX_RECEIPT_IMAGES_PER_UPLOAD;
  function addImages(selected: FileList | null) {
    if (!selected?.length) return;
    const next = [...files, ...Array.from(selected)];
    const error = validateReceiptImages(next);
    if (error) {
      toast.error(error);
      return;
    }
    onChange(next);
  }
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <Label>{label}</Label>
      <Input
        ref={fileInputRef}
        type="file"
        accept={RECEIPT_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        aria-label={`Chọn file ${label.toLocaleLowerCase("vi-VN")}`}
        disabled={disabled || full}
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept={RECEIPT_IMAGE_ACCEPT}
        capture="environment"
        className="sr-only"
        aria-label={`Chụp ${label.toLocaleLowerCase("vi-VN")}`}
        disabled={disabled || full}
        onChange={(event) => {
          addImages(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || full}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="size-4" /> Chọn file
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || full}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" /> Chụp ảnh
        </Button>
      </div>
      {!!files.length && (
        <div
          className="rounded border bg-gray-50 p-2 text-xs text-gray-600"
          aria-live="polite"
        >
          <p className="font-medium text-gray-700">
            Đã chọn {files.length} ảnh mới
          </p>
        </div>
      )}
      <p className="text-xs text-gray-500">
        JPG, PNG, WEBP hoặc GIF; tối đa 5 MB/ảnh và{" "}
        {MAX_RECEIPT_IMAGES_PER_UPLOAD} ảnh mới mỗi lần lưu.
      </p>
      <ReceiptImageGallery
        images={images}
        disabled={disabled}
        onRemove={onRemove}
      />
      {!!files.length && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="relative overflow-hidden rounded border bg-gray-50"
            >
              <SelectedImage file={file} />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute right-1 top-1"
                disabled={disabled}
                aria-label={`Bỏ chọn ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </Button>
              <p className="truncate px-2 py-1 text-xs" title={file.name}>
                {file.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
