"use client";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { mixingActivityTemplatesService } from "@/services/index.service";
import {
  ArrowLeft,
  Copy,
  Edit2,
  EllipsisVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  MixingActivityTemplate,
  UpdateMixingActivityTemplatePayload,
} from "../types";
import { cloneMixingActivityTemplateStructure } from "../clone-template-structure";
import { formatBatchSize, getCreatorLabel } from "../utils";
import MixingActivityTemplateDetail from "./mixing-activity-template-detail";

type TemplateFormState = {
  version: string;
  batchSize: string;
  unitOfMeasure: string;
  description: string;
};

type CopySourceOption = {
  value: string;
  label: string;
  searchValue: string;
  template: MixingActivityTemplate;
};

const emptyForm = (): TemplateFormState => ({
  version: "1",
  batchSize: "",
  unitOfMeasure: "",
  description: "",
});

const getErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message ?? error?.message;
  return Array.isArray(message) ? message.join("; ") : message ?? fallback;
};

const toFormState = (template: MixingActivityTemplate): TemplateFormState => ({
  version: String(template.version),
  batchSize: String(template.batch_size),
  unitOfMeasure: template.unit_of_measure,
  description: template.description ?? "",
});

export default function InlineMixingActivityTemplates({
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
    useState<MixingActivityTemplate | null>(null);
  const [cloningTemplate, setCloningTemplate] =
    useState<MixingActivityTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] =
    useState<MixingActivityTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopyFromOpen, setIsCopyFromOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const copyDialogContentRef = useRef<HTMLDivElement | null>(null);

  const listRoute = itemCode
    ? API_ROUTES.items.mixingActivityTemplates(itemCode)
    : null;
  const { data = [], error, isLoading, mutate } = useSWR(
    listRoute,
    () => mixingActivityTemplatesService.fetchByItemCode(itemCode!),
  );
  const {
    data: allTemplates = [],
    error: allTemplatesError,
    isLoading: isLoadingAllTemplates,
  } = useSWR(
    isCopyFromOpen ? API_ROUTES.items.allMixingActivityTemplates : null,
    () => mixingActivityTemplatesService.fetchAll(),
  );

  const templates = useMemo(
    () =>
      [...data].sort(
        (first, second) =>
          second.version - first.version || second.id - first.id,
      ),
    [data],
  );
  const nextCopyVersion =
    templates.reduce(
      (highestVersion, template) =>
        Math.max(highestVersion, template.version),
      0,
    ) + 1;
  const copySourceOptions = useMemo<CopySourceOption[]>(
    () =>
      allTemplates.map((template) => {
        const sourceItemCode =
          template.item_code ?? template.item?.item_code ?? "Không rõ mã";
        const sourceItemName = template.item?.item_name?.trim();
        const itemLabel = sourceItemName
          ? `${sourceItemCode} - ${sourceItemName}`
          : sourceItemCode;
        const description = template.description?.trim();
        const label = `${itemLabel} · Phiên bản ${template.version}${
          description ? ` · ${description}` : ""
        }`;

        return {
          value: String(template.id),
          label,
          searchValue: `${sourceItemCode} ${sourceItemName ?? ""} ${
            template.version
          } ${description ?? ""}`,
          template,
        };
      }),
    [allTemplates],
  );
  const selectedCopySource =
    copySourceOptions.find((option) => option.value === copySourceId) ?? null;
  const selectedListTemplate = useMemo(
    () =>
      selectedTemplateId === null
        ? null
        : templates.find((template) => template.id === selectedTemplateId) ??
          null,
    [selectedTemplateId, templates],
  );
  const {
    data: fetchedDetailTemplate,
    error: detailError,
    isLoading: isDetailLoading,
    mutate: mutateDetail,
  } = useSWR(
    selectedTemplateId === null
      ? null
      : API_ROUTES.items.mixingActivityTemplateDetail(selectedTemplateId),
    () => mixingActivityTemplatesService.fetchById(selectedTemplateId!),
  );
  const detailTemplate = fetchedDetailTemplate ?? selectedListTemplate;

  if (!itemCode) {
    return null;
  }

  const setFormOpen = (open: boolean) => {
    setIsFormOpen(open);

    if (!open) {
      setEditingTemplate(null);
      setCloningTemplate(null);
      setForm(emptyForm());
    }
  };

  const openCreateForm = () => {
    setEditingTemplate(null);
    setCloningTemplate(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (template: MixingActivityTemplate) => {
    setEditingTemplate(template);
    setCloningTemplate(null);
    setForm(toFormState(template));
    setFormOpen(true);
  };

  const openCloneForm = (template: MixingActivityTemplate) => {
    setEditingTemplate(null);
    setCloningTemplate(template);
    setForm(toFormState(template));
    setFormOpen(true);
  };

  const openCopyFrom = () => {
    setCopySourceId("");
    setIsCopyFromOpen(true);
  };

  const openDetail = (template: MixingActivityTemplate) => {
    setSelectedTemplateId(template.id);
  };

  const validateForm = () => {
    const version = Number(form.version);
    const batchSize = Number(form.batchSize);

    if (!Number.isInteger(version) || version <= 0) {
      toast.error("Phiên bản phải là số nguyên dương.");
      return false;
    }
    if (!Number.isFinite(batchSize) || batchSize <= 0) {
      toast.error("Cỡ lô phải là số dương.");
      return false;
    }
    if (!form.unitOfMeasure.trim()) {
      toast.error("Vui lòng nhập đơn vị tính.");
      return false;
    }
    if (form.unitOfMeasure.trim().length > 50) {
      toast.error("Đơn vị tính tối đa 50 ký tự.");
      return false;
    }
    if (!form.description.trim()) {
      toast.error("Vui lòng nhập mô tả.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    const nextValues = {
      version: Number(form.version),
      batch_size: Number(form.batchSize),
      unit_of_measure: form.unitOfMeasure.trim(),
      description: form.description.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        const payload: UpdateMixingActivityTemplatePayload = {};
        if (nextValues.version !== editingTemplate.version) {
          payload.version = nextValues.version;
        }
        if (nextValues.batch_size !== Number(editingTemplate.batch_size)) {
          payload.batch_size = nextValues.batch_size;
        }
        if (nextValues.unit_of_measure !== editingTemplate.unit_of_measure) {
          payload.unit_of_measure = nextValues.unit_of_measure;
        }
        if (nextValues.description !== (editingTemplate.description ?? null)) {
          payload.description = nextValues.description;
        }

        if (Object.keys(payload).length > 0) {
          await mixingActivityTemplatesService.update(editingTemplate.id, payload);
          toast.success("Đã cập nhật biểu mẫu theo dõi pha chế.");
        }
      } else {
        const createdTemplate = await mixingActivityTemplatesService.create(
          itemCode,
          nextValues,
        );

        if (cloningTemplate) {
          try {
            await cloneMixingActivityTemplateStructure(
              cloningTemplate.id,
              createdTemplate.id,
            );
          } catch (cloneError) {
            try {
              await mixingActivityTemplatesService.delete(createdTemplate.id);
            } catch (rollbackError) {
              void rollbackError;
              throw new Error(
                "Không thể nhân bản đầy đủ và biểu mẫu mới có thể đã được tạo một phần.",
              );
            }
            throw cloneError;
          }
          toast.success("Đã nhân bản biểu mẫu và toàn bộ nội dung pha chế.");
        } else {
          toast.success("Đã tạo biểu mẫu theo dõi pha chế.");
        }
      }

      setFormOpen(false);
      setEditingTemplate(null);
      await Promise.all([mutate(), editingTemplate ? mutateDetail() : null]);
    } catch (submitError) {
      toast.error(
        getErrorMessage(
          submitError,
          editingTemplate
            ? "Không thể cập nhật biểu mẫu theo dõi pha chế."
            : cloningTemplate
              ? "Không thể nhân bản biểu mẫu theo dõi pha chế."
              : "Không thể tạo biểu mẫu theo dõi pha chế.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyFrom = async () => {
    if (!selectedCopySource) {
      toast.error("Vui lòng chọn phiếu pha cần sao chép.");
      return;
    }

    const sourceTemplate = selectedCopySource.template;
    let createdTemplate: MixingActivityTemplate | null = null;

    setIsSubmitting(true);
    try {
      createdTemplate = await mixingActivityTemplatesService.create(itemCode, {
        version: nextCopyVersion,
        batch_size: Number(sourceTemplate.batch_size),
        unit_of_measure: sourceTemplate.unit_of_measure,
        description: sourceTemplate.description ?? null,
      });

      try {
        await cloneMixingActivityTemplateStructure(
          sourceTemplate.id,
          createdTemplate.id,
        );
      } catch (cloneError) {
        try {
          await mixingActivityTemplatesService.delete(createdTemplate.id);
          createdTemplate = null;
        } catch (rollbackError) {
          void rollbackError;
          throw new Error(
            "Không thể sao chép đầy đủ và phiếu mới có thể đã được tạo một phần. Vui lòng tải lại để kiểm tra.",
          );
        }
        throw cloneError;
      }

      setIsCopyFromOpen(false);
      setCopySourceId("");
      toast.success(
        `Đã copy phiếu sang ${itemCode} với phiên bản ${nextCopyVersion}.`,
      );
      await mutate();
    } catch (copyError) {
      await mutate();
      toast.error(
        getErrorMessage(copyError, "Không thể copy phiếu pha đã chọn."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setIsSubmitting(true);
    try {
      await mixingActivityTemplatesService.delete(deletingTemplate.id);
      toast.success("Đã xóa biểu mẫu theo dõi pha chế.");
      if (selectedTemplateId === deletingTemplate.id) {
        setSelectedTemplateId(null);
      }
      setDeletingTemplate(null);
      await mutate();
    } catch (deleteError) {
      toast.error(
        getErrorMessage(deleteError, "Không thể xóa biểu mẫu theo dõi pha chế."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl pb-24">
      {detailTemplate ? (
        <MixingActivityTemplateDetail
          template={detailTemplate}
          itemCode={itemCode}
          itemName={itemName}
          isLoading={isDetailLoading}
          errorMessage={
            detailError
              ? getErrorMessage(
                  detailError,
                  "Không thể tải dữ liệu mới nhất của biểu mẫu pha chế.",
                )
              : null
          }
          onClose={() => setSelectedTemplateId(null)}
          onEdit={() => openEditForm(detailTemplate)}
          onDelete={() => setDeletingTemplate(detailTemplate)}
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
                Biểu mẫu theo dõi hoạt động pha
              </h2>
              <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
                {itemCode}
                {itemName ? ` - ${itemName}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <Button type="button" variant="outline" onClick={openCopyFrom}>
              <Copy className="size-4" />
              Copy từ
            </Button>
            <Button type="button" onClick={openCreateForm}>
              <Plus className="size-4" />
              Thêm
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getErrorMessage(error, "Không thể tải danh sách biểu mẫu pha chế.")}
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-[100px] items-center gap-4 px-3 py-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="w-36 shrink-0 space-y-2">
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="ml-auto h-4 w-28 animate-pulse rounded bg-gray-100" />
                  <div className="ml-auto h-7 w-24 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length > 0 ? (
          <div className="divide-y divide-gray-200 border-y border-gray-200">
            {templates.map((template) => (
              <article
                key={template.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(template)}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    openDetail(template);
                  }
                }}
                className="flex min-h-[100px] cursor-pointer items-center gap-4 px-3 py-4 outline-none transition-colors hover:bg-gray-50 focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {template.description || "Biểu mẫu theo dõi hoạt động pha"}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-600">
                    Phiên bản {template.version}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm text-gray-700">
                    {formatBatchSize(template.batch_size)} {template.unit_of_measure}
                  </p>
                  <p className="mt-1 max-w-52 truncate text-xs font-semibold text-amber-600">
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
                    <DropdownMenuItem onSelect={() => openCloneForm(template)}>
                      <Copy className="size-4" />
                      Nhân bản
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openEditForm(template)}>
                      <Edit2 className="size-4" />
                      Sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeletingTemplate(template)}
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-gray-500">
            Chưa có biểu mẫu theo dõi pha chế cho mã hàng này.
          </div>
        )}
      </section>
      )}

      <Dialog
        open={isCopyFromOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setIsCopyFromOpen(open);
            if (!open) setCopySourceId("");
          }
        }}
      >
        <DialogContent ref={copyDialogContentRef} className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Copy phiếu pha từ template khác</DialogTitle>
            <DialogDescription>
              Chọn phiếu nguồn từ bất kỳ sản phẩm nào. Phiếu mới sẽ được tạo
              cho {itemCode} với phiên bản {nextCopyVersion}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Phiếu nguồn *</Label>
            <Combobox
              autoHighlight
              items={copySourceOptions}
              value={selectedCopySource}
              onValueChange={(option) =>
                setCopySourceId(option?.value ?? "")
              }
              itemToStringLabel={(option) => option.label}
              itemToStringValue={(option) => option.searchValue}
              isItemEqualToValue={(option, selected) =>
                option.value === selected.value
              }
            >
              <ComboboxInput
                className="w-full"
                disabled={isSubmitting || isLoadingAllTemplates}
                placeholder={
                  isLoadingAllTemplates
                    ? "Đang tải danh sách phiếu..."
                    : "Tìm theo mã, tên sản phẩm, phiên bản hoặc mô tả"
                }
                showClear
              />
              <ComboboxContent portalContainer={copyDialogContentRef}>
                <ComboboxEmpty>Không tìm thấy phiếu phù hợp.</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.value} value={option}>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {option.template.item_code ??
                            option.template.item?.item_code ??
                            "Không rõ mã"}
                          {option.template.item?.item_name
                            ? ` - ${option.template.item.item_name}`
                            : ""}
                          {` · Phiên bản ${option.template.version}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {option.template.description || "Không có mô tả"}
                          {` · ${formatBatchSize(option.template.batch_size)} ${option.template.unit_of_measure}`}
                        </p>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {allTemplatesError ? (
              <p className="text-sm text-destructive">
                {getErrorMessage(
                  allTemplatesError,
                  "Không thể tải danh sách template phiếu pha.",
                )}
              </p>
            ) : null}
          </div>

          {selectedCopySource ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              Toàn bộ giai đoạn, bước và thông số của phiếu đã chọn sẽ được
              sao chép sang sản phẩm {itemCode}.
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setIsCopyFromOpen(false);
                setCopySourceId("");
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                isSubmitting ||
                isLoadingAllTemplates ||
                Boolean(allTemplatesError) ||
                !selectedCopySource
              }
              onClick={() => void handleCopyFrom()}
            >
              <Copy className="size-4" />
              {isSubmitting ? "Đang copy..." : "Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setFormOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? "Cập nhật biểu mẫu theo dõi pha chế"
                : cloningTemplate
                  ? "Nhân bản biểu mẫu theo dõi pha chế"
                  : "Nhập biểu mẫu theo dõi pha chế"}
            </DialogTitle>
            <DialogDescription>
              {cloningTemplate
                ? `Chỉnh sửa thông tin bản sao. Toàn bộ giai đoạn, bước và thông số từ biểu mẫu phiên bản ${cloningTemplate.version} sẽ được sao chép.`
                : `Thiết lập phiên bản và cỡ lô áp dụng cho mã hàng ${itemCode}.`}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="mixing-template-version">Phiên bản *</Label>
              <Input
                id="mixing-template-version"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.version}
                disabled={isSubmitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    version: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixing-template-batch-size">Cỡ lô *</Label>
              <Input
                id="mixing-template-batch-size"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.batchSize}
                disabled={isSubmitting}
                placeholder="100"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    batchSize: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixing-template-unit">Đơn vị tính *</Label>
              <Input
                id="mixing-template-unit"
                value={form.unitOfMeasure}
                maxLength={50}
                disabled={isSubmitting}
                placeholder="kg"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unitOfMeasure: event.target.value,
                  }))
                }
              />
              <p className="text-right text-xs text-gray-400">
                {form.unitOfMeasure.length}/50
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mixing-template-description">Mô tả *</Label>
              <Textarea
                id="mixing-template-description"
                value={form.description}
                rows={4}
                required
                disabled={isSubmitting}
                placeholder="Biểu mẫu theo dõi hoạt động pha cỡ lô 100 kg"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? cloningTemplate
                    ? "Đang nhân bản..."
                    : "Đang lưu..."
                  : cloningTemplate
                    ? "Nhân bản"
                    : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setDeletingTemplate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa biểu mẫu theo dõi pha chế</DialogTitle>
            <DialogDescription>
              Biểu mẫu phiên bản {deletingTemplate?.version} sẽ bị xóa khỏi mã
              hàng {itemCode}. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTemplate(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
