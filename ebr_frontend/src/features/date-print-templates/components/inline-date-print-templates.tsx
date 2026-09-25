"use client";

import AuthenticatedImage, {
  ImagePreviewDialog,
} from "@/components/authenticated-image/authenticated-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import { datePrintTemplatesService } from "@/services/index.service";
import {
  ArrowLeft,
  CircleCheck,
  CircleOff,
  EllipsisVertical,
  Eye,
  ImageUp,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  CreateDatePrintTemplatePayload,
  DatePrintTemplate,
  UpdateDatePrintTemplatePayload,
} from "../types";
import DatePrintTemplateDetail from "./date-print-template-detail";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

type TemplateFormState = {
  version: string;
  description: string;
  printContent: string;
  printPosition: string;
};

const emptyForm = (): TemplateFormState => ({
  version: "1",
  description: "",
  printContent: "",
  printPosition: "",
});

const toFormState = (template: DatePrintTemplate): TemplateFormState => ({
  version: String(template.version),
  description: template.description ?? "",
  printContent: template.print_content,
  printPosition: template.print_position ?? "",
});

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message || fallback;
};

const getCreatorLabel = (template: DatePrintTemplate) =>
  template.createdBy?.name?.trim() ||
  template.createdBy?.username?.trim() ||
  template.createdBy?.email?.trim() ||
  "Không rõ người tạo";

const getImageFilename = (imagePath?: string | null) => {
  const filename = imagePath?.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  if (!filename) return "";

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

export default function InlineDatePrintTemplates({
  itemCode,
  itemName,
  onClose,
}: {
  itemCode: string | undefined;
  itemName?: string | null;
  onClose?: () => void;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<DatePrintTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [previewTemplate, setPreviewTemplate] =
    useState<DatePrintTemplate | null>(null);
  const [imageTarget, setImageTarget] = useState<DatePrintTemplate | null>(
    null,
  );
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const formImageInputRef = useRef<HTMLInputElement | null>(null);

  const listRoute = itemCode
    ? API_ROUTES.items.datePrintTemplates(itemCode)
    : null;
  const {
    data = [],
    error,
    isLoading,
    mutate,
  } = useSWR(listRoute, () =>
    datePrintTemplatesService.fetchByItemCode(itemCode!),
  );
  const templates = useMemo(
    () =>
      [...data].sort(
        (first, second) =>
          second.version - first.version || second.id - first.id,
      ),
    [data],
  );
  const selectedTemplate = useMemo(
    () =>
      selectedTemplateId === null
        ? null
        : (templates.find((template) => template.id === selectedTemplateId) ??
          null),
    [selectedTemplateId, templates],
  );

  if (!itemCode) return null;

  const replaceTemplate = async (updatedTemplate: DatePrintTemplate) => {
    await mutate(
      (current) =>
        current?.map((template) =>
          template.id === updatedTemplate.id ? updatedTemplate : template,
        ),
      { revalidate: false },
    );
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTemplate(null);
    setForm(emptyForm());
    setFormImage(null);
    if (formImageInputRef.current) formImageInputRef.current.value = "";
  };

  const openCreateForm = () => {
    const nextVersion =
      templates.reduce(
        (currentVersion, template) =>
          Math.max(currentVersion, template.version),
        0,
      ) + 1;
    setEditingTemplate(null);
    setForm({ ...emptyForm(), version: String(nextVersion) });
    setFormImage(null);
    if (formImageInputRef.current) formImageInputRef.current.value = "";
    setIsFormOpen(true);
  };

  const openEditForm = (template: DatePrintTemplate) => {
    setEditingTemplate(template);
    setForm(toFormState(template));
    setFormImage(null);
    if (formImageInputRef.current) formImageInputRef.current.value = "";
    setIsFormOpen(true);
  };

  const validateImageFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Ảnh phải có định dạng JPG, PNG, WEBP hoặc GIF.");
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Dung lượng ảnh tối đa là 20 MB.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const version = Number(form.version);
    const printContent = form.printContent.trim();
    if (!Number.isInteger(version) || version <= 0) {
      toast.error("Phiên bản phải là số nguyên dương.");
      return;
    }
    if (!printContent) {
      toast.error("Vui lòng nhập nội dung in.");
      return;
    }
    if (!editingTemplate && formImage && !validateImageFile(formImage)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        const payload: UpdateDatePrintTemplatePayload = {};
        if (version !== editingTemplate.version) payload.version = version;
        if (printContent !== editingTemplate.print_content) {
          payload.print_content = printContent;
        }

        const description = form.description.trim() || null;
        if (description !== (editingTemplate.description ?? null)) {
          payload.description = description;
        }

        const printPosition = form.printPosition.trim() || null;
        if (printPosition !== (editingTemplate.print_position ?? null)) {
          payload.print_position = printPosition;
        }

        if (Object.keys(payload).length > 0) {
          const updatedTemplate = await datePrintTemplatesService.update(
            editingTemplate.id,
            payload,
          );
          await replaceTemplate(updatedTemplate);
          if (previewTemplate?.id === updatedTemplate.id) {
            setPreviewTemplate(updatedTemplate);
          }
          toast.success("Đã cập nhật biểu mẫu in date.");
        }
      } else {
        const payload: CreateDatePrintTemplatePayload = {
          version,
          description: form.description.trim() || null,
          print_content: printContent,
          print_position: form.printPosition.trim() || null,
        };
        const createdTemplate = await datePrintTemplatesService.create(
          itemCode,
          payload,
        );
        let templateToAdd = createdTemplate;
        if (formImage) {
          try {
            templateToAdd = await datePrintTemplatesService.uploadImage(
              createdTemplate.id,
              formImage,
            );
          } catch (uploadError) {
            await mutate((current) => [createdTemplate, ...(current ?? [])], {
              revalidate: false,
            });
            toast.error(
              getErrorMessage(
                uploadError,
                "Đã tạo biểu mẫu nhưng không thể tải ảnh lên.",
              ),
            );
            closeForm();
            return;
          }
        }
        await mutate((current) => [templateToAdd, ...(current ?? [])], {
          revalidate: false,
        });
        toast.success(
          formImage
            ? "Đã tạo biểu mẫu in date kèm ảnh minh họa."
            : "Đã tạo biểu mẫu in date.",
        );
      }

      closeForm();
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingTemplate
            ? "Không thể cập nhật biểu mẫu in date."
            : "Không thể tạo biểu mẫu in date.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    template: DatePrintTemplate,
    isActive: boolean,
  ) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updatedTemplate = await datePrintTemplatesService.update(
        template.id,
        { status: isActive ? "active" : "inactive" },
      );
      await replaceTemplate(updatedTemplate);
      if (previewTemplate?.id === updatedTemplate.id) {
        setPreviewTemplate(updatedTemplate);
      }
      toast.success(
        isActive
          ? "Đã kích hoạt biểu mẫu in date."
          : "Đã ngừng sử dụng biểu mẫu in date.",
      );
    } catch (statusError) {
      toast.error(
        getErrorMessage(statusError, "Không thể cập nhật trạng thái biểu mẫu."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (template: DatePrintTemplate) => {
    if (
      isSubmitting ||
      !window.confirm(
        `Bạn có chắc chắn muốn xóa biểu mẫu phiên bản ${template.version}?`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await datePrintTemplatesService.delete(template.id);
      await mutate(
        (current) => current?.filter(({ id }) => id !== template.id),
        { revalidate: false },
      );
      if (selectedTemplateId === template.id) setSelectedTemplateId(null);
      if (previewTemplate?.id === template.id) setPreviewTemplate(null);
      toast.success("Đã xóa biểu mẫu in date.");
    } catch (deleteError) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa biểu mẫu in date."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectImage = (template: DatePrintTemplate) => {
    setImageTarget(template);
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (file?: File) => {
    const template = imageTarget;
    if (!file || !template) return;

    if (!validateImageFile(file)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTemplate = await datePrintTemplatesService.uploadImage(
        template.id,
        file,
      );
      await replaceTemplate(updatedTemplate);
      if (previewTemplate?.id === updatedTemplate.id) {
        setPreviewTemplate(updatedTemplate);
      }
      toast.success("Đã lưu ảnh minh họa.");
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError, "Không thể tải ảnh lên."));
    } finally {
      setIsSubmitting(false);
      setImageTarget(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (template: DatePrintTemplate) => {
    if (
      isSubmitting ||
      !window.confirm("Bạn có chắc chắn muốn xóa ảnh minh họa này?")
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTemplate = await datePrintTemplatesService.deleteImage(
        template.id,
      );
      await replaceTemplate(updatedTemplate);
      setPreviewTemplate(null);
      toast.success("Đã xóa ảnh minh họa.");
    } catch (deleteImageError) {
      toast.error(
        getErrorMessage(deleteImageError, "Không thể xóa ảnh minh họa."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewFilename = getImageFilename(previewTemplate?.image_path);

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void handleImageSelected(event.target.files?.[0])}
      />

      {selectedTemplate ? (
        <DatePrintTemplateDetail
          template={selectedTemplate}
          itemCode={itemCode}
          itemName={itemName}
          creatorLabel={getCreatorLabel(selectedTemplate)}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedTemplateId(null)}
          onEdit={() => openEditForm(selectedTemplate)}
          onStatusChange={() =>
            void handleStatusChange(
              selectedTemplate,
              selectedTemplate.status !== "active",
            )
          }
          onDelete={() => void handleDelete(selectedTemplate)}
          onSelectImage={() => selectImage(selectedTemplate)}
          onDeleteImage={() => void handleDeleteImage(selectedTemplate)}
        />
      ) : (
        <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
          <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              {onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0"
                  onClick={onClose}
                  title="Quay lại chi tiết mã hàng"
                  aria-label="Quay lại chi tiết mã hàng"
                >
                  <ArrowLeft className="size-5" />
                </Button>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
                  Biểu mẫu in date
                </h2>
                <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
                  {itemCode}
                  {itemName ? ` - ${itemName}` : ""}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="self-end sm:self-auto"
              onClick={openCreateForm}
            >
              <Plus className="size-4" />
              Thêm
            </Button>
          </div>

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getErrorMessage(
                error,
                "Không thể tải danh sách biểu mẫu in date.",
              )}
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-md border bg-slate-50"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              Chưa có biểu mẫu in date cho mã hàng này.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {templates.map((template) => {
                const imageFilename = getImageFilename(template.image_path);
                const isActive = template.status === "active";

                return (
                  <article
                    key={template.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTemplateId(template.id)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        setSelectedTemplateId(template.id);
                      }
                    }}
                    className="flex min-h-[100px] cursor-pointer items-center gap-4 px-3 py-4 outline-none transition-colors hover:bg-gray-50 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  >
                    {imageFilename ? (
                      <AuthenticatedImage
                        src={template.image_path}
                        alt={`Ảnh minh họa biểu mẫu phiên bản ${template.version}`}
                        className="h-20 w-20 shrink-0"
                        width={80}
                        height={80}
                        loading="lazy"
                        objectFit="cover"
                        previewTitle={`Ảnh minh họa biểu mẫu phiên bản ${template.version}`}
                      />
                    ) : (
                      <div
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded border bg-slate-50 text-slate-400"
                        title="Chưa có ảnh minh họa"
                      >
                        <ImageIcon className="size-7" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {template.description || "Biểu mẫu in date"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-sm text-gray-600">
                          Phiên bản {template.version}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }
                        >
                          {isActive ? "Đang sử dụng" : "Ngừng sử dụng"}
                        </Badge>
                      </div>
                    </div>

                    <div className="min-w-0 shrink-0 text-right">
                      <p
                        className="max-w-32 truncate text-sm text-gray-700 sm:max-w-52"
                        title={template.print_position ?? undefined}
                      >
                        {template.print_position || "Chưa cập nhật vị trí"}
                      </p>
                      <p className="mt-1 max-w-32 truncate text-xs font-semibold text-amber-600 sm:max-w-52">
                        {getCreatorLabel(template)}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Thao tác biểu mẫu phiên bản ${template.version}`}
                        >
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onSelect={() => openEditForm(template)}
                        >
                          <Pencil className="size-4" />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isSubmitting}
                          onSelect={() =>
                            void handleStatusChange(template, !isActive)
                          }
                        >
                          {isActive ? (
                            <CircleOff className="size-4" />
                          ) : (
                            <CircleCheck className="size-4" />
                          )}
                          {isActive ? "Ngừng sử dụng" : "Đưa vào sử dụng"}
                        </DropdownMenuItem>
                        {imageFilename ? (
                          <>
                            <DropdownMenuItem
                              onSelect={() => setPreviewTemplate(template)}
                            >
                              <Eye className="size-4" />
                              Xem ảnh
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isSubmitting}
                              onSelect={() => selectImage(template)}
                            >
                              <ImageUp className="size-4" />
                              Thay ảnh
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={isSubmitting}
                              onSelect={() => void handleDeleteImage(template)}
                            >
                              <Trash2 className="size-4" />
                              Xóa ảnh
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            disabled={isSubmitting}
                            onSelect={() => selectImage(template)}
                          >
                            <ImageUp className="size-4" />
                            Thêm ảnh
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isSubmitting}
                          onSelect={() => void handleDelete(template)}
                        >
                          <Trash2 className="size-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Cập nhật" : "Tạo"} biểu mẫu in date
            </DialogTitle>
            <DialogDescription>
              Nội dung in có thể sử dụng các biến như {"{{manufacturing_date}}"}
              ,{" {{expiry_date}}"} hoặc {" {{batch_number}}"}.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="space-y-2">
              <Label htmlFor="date-print-template-version">Phiên bản</Label>
              <Input
                id="date-print-template-version"
                type="number"
                min="1"
                step="1"
                value={form.version}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    version: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-print-template-description">Mô tả</Label>
              <Input
                id="date-print-template-description"
                value={form.description}
                placeholder="Ví dụ: Nhãn chai 500 ml"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-print-template-position">
                Vị trí in date
              </Label>
              <Input
                id="date-print-template-position"
                value={form.printPosition}
                maxLength={255}
                placeholder="Ví dụ: Mặt đáy chai hoặc mép hàn túi"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    printPosition: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-print-template-content">Nội dung in</Label>
              <Textarea
                id="date-print-template-content"
                value={form.printContent}
                rows={8}
                required
                placeholder={
                  "NSX: {{manufacturing_date}}\nHSD: {{expiry_date}}\nSố lô: {{batch_number}}"
                }
                className="font-mono"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    printContent: event.target.value,
                  }))
                }
              />
            </div>
            {!editingTemplate ? (
              <div className="space-y-2">
                <Label htmlFor="date-print-template-image">Ảnh minh họa</Label>
                <Input
                  ref={formImageInputRef}
                  id="date-print-template-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setFormImage(event.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP hoặc GIF; tối đa 20 MB.
                </p>
                {formImage ? (
                  <p className="text-xs text-slate-600">
                    Đã chọn: {formImage.name}
                  </p>
                ) : null}
              </div>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={closeForm}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {previewTemplate && previewFilename ? (
        <ImagePreviewDialog
          key={`${previewTemplate.id}-${previewTemplate.image_path}`}
          open={Boolean(previewTemplate)}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          src={API_ROUTES.items.datePrintTemplateImageFile(previewFilename)}
          alt={`Ảnh minh họa biểu mẫu in date phiên bản ${previewTemplate.version}`}
          title="Ảnh minh họa biểu mẫu in date"
          description={previewTemplate.description || "Biểu mẫu in date"}
          footer={
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => void handleDeleteImage(previewTemplate)}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Xóa ảnh
            </Button>
          }
        />
      ) : null}
    </>
  );
}
