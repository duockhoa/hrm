"use client";

import { useId, useRef } from "react";
import { Camera, ImageUp } from "lucide-react";
import { toast } from "sonner";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import SelectedImagePreview from "@/components/selected-image-preview/selected-image-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export default function SteamSterilizationImagePicker({
  label,
  file,
  savedPath,
  disabled = false,
  onChange,
}: {
  label: string;
  file: File | null;
  savedPath?: string | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (!IMAGE_ACCEPT.split(",").includes(selected.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (!selected.size || selected.size > 20 * 1024 * 1024) {
      toast.error("Ảnh phải có dữ liệu và dung lượng không quá 20 MB.");
      return;
    }
    onChange(selected);
  }
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={disabled}
        className="sr-only"
        aria-label={`Chọn file ${label.toLocaleLowerCase("vi-VN")}`}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        disabled={disabled}
        className="sr-only"
        aria-label={`Chụp ${label.toLocaleLowerCase("vi-VN")}`}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
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
          <ImageUp className="size-4" /> Chọn file
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
      {file && (
        <div
          className="rounded border bg-gray-50 p-2 text-xs text-gray-600"
          aria-live="polite"
        >
          <p className="font-medium text-gray-700">Đã chọn 1 ảnh mới</p>
        </div>
      )}
      <p className="text-xs text-gray-500">
        JPG, PNG, WEBP hoặc GIF; tối đa 20 MB/ảnh, một ảnh cho mỗi vị trí.
      </p>
      {(file || savedPath) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {file ? (
            <SelectedImagePreview
              file={file}
              disabled={disabled}
              onRemove={() => onChange(null)}
            />
          ) : (
            <div className="overflow-hidden rounded border bg-gray-50">
              <AuthenticatedImage
                src={savedPath}
                alt={label}
                width={240}
                height={160}
                className="h-28 w-full rounded-none border-0"
              />
              <p className="truncate px-2 py-1 text-xs">Ảnh đã lưu</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
