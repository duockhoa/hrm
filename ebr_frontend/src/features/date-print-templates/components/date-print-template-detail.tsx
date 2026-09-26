"use client";

import AuthenticatedImage, {
  ImagePreviewDialog,
} from "@/components/authenticated-image/authenticated-image";
import FieldDisplay from "@/components/field-display/field-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CircleCheck,
  CircleOff,
  ImageIcon,
  ImageUp,
  Pencil,
  Trash2,
} from "lucide-react";
import type { DatePrintTemplate } from "../types";
import { useState } from "react";
import DatePrintImageEditor from "./date-print-image-editor";

export default function DatePrintTemplateDetail({
  template,
  itemCode,
  itemName,
  creatorLabel,
  isSubmitting = false,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
  onSelectImage,
  onDeleteImage,
  onSaveImage,
}: {
  template: DatePrintTemplate;
  itemCode: string;
  itemName?: string | null;
  creatorLabel: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
  onSelectImage: () => void;
  onDeleteImage: () => void;
  onSaveImage: (file: File) => Promise<void>;
}) {
  const isActive = template.status === "active";
  const [imageMode, setImageMode] = useState<"preview" | "edit" | null>(null);

  return (
    <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={onClose}
            title="Quay lại danh sách biểu mẫu"
            aria-label="Quay lại danh sách biểu mẫu"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Chi tiết biểu mẫu in date
            </h2>
            <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
              {itemCode}
              {itemName ? ` - ${itemName}` : ""}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {isActive ? "Đang sử dụng" : "Ngừng sử dụng"}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
            Sửa
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onStatusChange}
          >
            {isActive ? (
              <CircleOff className="size-4" />
            ) : (
              <CircleCheck className="size-4" />
            )}
            {isActive ? "Ngừng sử dụng" : "Đưa vào sử dụng"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Xóa
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <FieldDisplay
          lable="Mô tả"
          value={template.description || "Chưa cập nhật"}
        />
        <FieldDisplay lable="Phiên bản" value={String(template.version)} />
        <FieldDisplay
          lable="Vị trí in date"
          value={template.print_position || "Chưa cập nhật"}
        />
        <FieldDisplay lable="Nội dung in" value={template.print_content} />

        <div className="flex w-full justify-start gap-3 md:gap-4">
          <div className="m-0.5 w-[170px] shrink-0 pr-1 text-left font-semibold text-gray-600 wrap-anywhere md:m-1 md:w-[220px] md:pr-2">
            Ảnh minh họa
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={onSelectImage}
              >
                <ImageUp className="size-4" />
                {template.image_path ? "Thay ảnh" : "Thêm ảnh"}
              </Button>
              {template.image_path ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={onDeleteImage}
                >
                  <Trash2 className="size-4" />
                  Xóa ảnh
                </Button>
              ) : null}
            </div>

            {template.image_path ? (
              <AuthenticatedImage
                src={template.image_path}
                alt={`Ảnh minh họa biểu mẫu phiên bản ${template.version}`}
                className="h-64 w-full"
                width={720}
                height={256}
                objectFit="contain"
                preview={false}
                onClick={() => setImageMode("preview")}
              />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded border border-dashed bg-slate-50 text-sm text-slate-500">
                <ImageIcon className="size-8" />
                Chưa có ảnh minh họa
              </div>
            )}
          </div>
        </div>
        <FieldDisplay lable="NSX khi xuất phiếu" value={template.manufacturing_date_format || "Mặc định: ddmmyy"} />
        <FieldDisplay lable="HSD khi xuất phiếu" value={template.expiry_date_format || "Mặc định: ddmmyy"} />
        <FieldDisplay lable="Người tạo" value={creatorLabel} />
      </div>
      {imageMode === "preview" && template.image_path && (
        <ImagePreviewDialog
          open
          src={template.image_path}
          alt={`Ảnh minh họa biểu mẫu phiên bản ${template.version}`}
          title={`Ảnh minh họa biểu mẫu phiên bản ${template.version}`}
          onOpenChange={(open) => {
            if (!open) setImageMode(null);
          }}
          footer={
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setImageMode("edit")}
            >
              <Pencil className="size-4" />
              Sửa ảnh
            </Button>
          }
        />
      )}
      {imageMode === "edit" && template.image_path && (
        <DatePrintImageEditor
          src={template.image_path}
          onClose={() => setImageMode("preview")}
          onSave={onSaveImage}
        />
      )}
    </section>
  );
}
