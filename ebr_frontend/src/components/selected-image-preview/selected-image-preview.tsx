"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { Button } from "@/components/ui/button";

export default function SelectedImagePreview({
  file,
  disabled = false,
  onRemove,
}: {
  file: File;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<{ file: File; src: string } | null>(
    null,
  );
  useEffect(() => {
    const src = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => {
      if (active) setPreview({ file, src });
    });
    return () => {
      active = false;
      URL.revokeObjectURL(src);
    };
  }, [file]);
  return (
    <div className="relative overflow-hidden rounded border bg-gray-50">
      <AuthenticatedImage
        src={preview?.file === file ? preview.src : undefined}
        alt={file.name}
        width={240}
        height={160}
        className="h-28 w-full rounded-none border-0"
        loading="eager"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="absolute right-1 top-1"
        disabled={disabled}
        aria-label={`Bỏ chọn ${file.name}`}
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
      <p className="truncate px-2 py-1 text-xs" title={file.name}>
        {file.name}
      </p>
    </div>
  );
}
