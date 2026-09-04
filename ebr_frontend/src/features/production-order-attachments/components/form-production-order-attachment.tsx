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
import {
  MAX_ATTACHMENT_FILES_PER_REQUEST,
  validateAttachmentFiles,
} from "../utils";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? error?.message ?? fallback;

export default function FormProductionOrderAttachment({
  productionOrderId,
  attachmentType = "packaging_slip",
  title = "Hình ảnh phiếu đóng gói",
  onClose,
}: {
  productionOrderId: string | number;
  attachmentType?: string;
  title?: string;
  onClose?: () => void;
}) {
  const [description, setDescription] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    const selectedFiles = Array.from(fileList ?? []);
    if (selectedFiles.length === 0) return;

    const nextFiles = [...files, ...selectedFiles];
    const validationError = validateAttachmentFiles(nextFiles);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setFiles(nextFiles);
  };

  const reset = () => {
    setDescription("");
    setFiles([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateAttachmentFiles(files);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("attachment_type", attachmentType);
    if (description.trim()) formData.append("description", description.trim());
    formData.append("requires_approval", "true");
    files.forEach((file) => formData.append("files", file));

    try {
      setIsSubmitting(true);
      await productionOrdersService.createProductionOrderAttachment(
        productionOrderId,
        formData,
      );
      await mutate(
        API_ROUTES.productionOrders.attachments(productionOrderId),
      );
      toast.success(`Đã lưu ${title.toLocaleLowerCase("vi-VN")}.`);
      reset();
      onClose?.();
    } catch (error: any) {
      toast.error(
        getErrorMessage(
          error,
          `Không thể lưu ${title.toLocaleLowerCase("vi-VN")}.`,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[430px] rounded-md bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-center text-xl font-semibold uppercase text-gray-900">
          {title}
        </p>

        <div className="space-y-2">
          <Label>Ảnh đính kèm</Label>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={isSubmitting}
            onChange={(event) => {
              addFiles(event.target.files);
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
              addFiles(event.target.files);
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
          <p className="text-xs text-gray-500">
            JPG, PNG, WEBP hoặc GIF. Tối đa {MAX_ATTACHMENT_FILES_PER_REQUEST} ảnh,
            mỗi ảnh không quá 20 MB.
          </p>
        </div>

        {files.length > 0 ? (
          <div className="space-y-2 rounded border bg-gray-50 p-3">
            <p className="text-sm font-medium">Đã chọn {files.length} ảnh</p>
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isSubmitting}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, fileIndex) => fileIndex !== index),
                    )
                  }
                  aria-label={`Bỏ chọn ${file.name}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`attachment-description-${attachmentType}`}>
            Mô tả
          </Label>
          <Textarea
            id={`attachment-description-${attachmentType}`}
            value={description}
            disabled={isSubmitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={reset}
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
