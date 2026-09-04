"use client";

import * as React from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHECK_IMAGE_ACCEPT,
  MAX_CHECK_IMAGES,
  validateCheckImages,
} from "../utils";

function SelectedImagePreview({ file }: { file: File }) {
  const url = React.useMemo(() => URL.createObjectURL(file), [file]);

  React.useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={file.name} className="h-24 w-full object-cover" />
  );
}

export default function MultiImagePicker({
  files,
  onChange,
  existingCount = 0,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existingCount?: number;
  disabled?: boolean;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, MAX_CHECK_IMAGES - existingCount - files.length);

  const addFiles = (fileList: FileList | null) => {
    const selected = Array.from(fileList ?? []);
    if (selected.length === 0) return;

    const nextFiles = [...files, ...selected];
    const validationError = validateCheckImages(nextFiles, existingCount);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    onChange(nextFiles);
  };

  return (
    <div className="space-y-2">
      <Label>Ảnh kiểm tra</Label>
      <Input
        ref={fileInputRef}
        type="file"
        accept={CHECK_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || remaining === 0}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept={CHECK_IMAGE_ACCEPT}
        capture="environment"
        className="sr-only"
        disabled={disabled || remaining === 0}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || remaining === 0}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="size-4" /> Chụp ảnh
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || remaining === 0}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageUp className="size-4" /> Tải ảnh lên
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        JPG, PNG, WEBP hoặc GIF; tối đa 20 MB/ảnh. Còn có thể thêm {remaining} ảnh.
      </p>

      {files.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="relative overflow-hidden rounded border bg-gray-50"
            >
              <SelectedImagePreview file={file} />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute right-1 top-1"
                disabled={disabled}
                aria-label={`Bỏ chọn ${file.name}`}
                onClick={() =>
                  onChange(files.filter((_, fileIndex) => fileIndex !== index))
                }
              >
                <X className="size-4" />
              </Button>
              <p className="truncate px-2 py-1 text-xs" title={file.name}>
                {file.name}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
