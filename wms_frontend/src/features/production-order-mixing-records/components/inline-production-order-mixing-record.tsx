"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { API_ROUTES } from "@/lib/api-routes";
import {
  mixingActivityTemplatesService,
  productionOrderMixingRecordsService,
} from "@/services/index.service";
import {
  ArrowLeft,
  EllipsisVertical,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { ProductionOrderMixingRecord } from "../types";
import {
  formatRecordDateTime,
  getPersonLabel,
  getRecordBatchSize,
  getRecordDescription,
  getRecordUnit,
  getRecordVersion,
} from "../utils";
import ProductionOrderMixingRecordDetail from "./production-order-mixing-record-detail";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const DEFAULT_DESCRIPTION = "Phiếu theo dõi pha chế";

const formatBatchSize = (value: number | string | null) => {
  if (value === null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(parsed)
    : String(value);
};

export default function InlineProductionOrderMixingRecord({
  productionOrder,
  onClose,
}: {
  productionOrder: any;
  onClose: () => void;
}) {
  const productionOrderId =
    productionOrder?.id ??
    productionOrder?.production_order_id ??
    productionOrder?.DocumentAbsoluteEntry;
  const itemCode = String(
    productionOrder?.item_code ?? productionOrder?.item?.item_code ?? "",
  );
  const itemName = productionOrder?.item?.item_name ?? productionOrder?.item_name ?? "";
  const lotNumber =
    productionOrder?.lot_no ??
    productionOrder?.lot_number ??
    productionOrder?.batch_number ??
    "";
  const [selectedRecord, setSelectedRecord] =
    useState<ProductionOrderMixingRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] =
    useState<ProductionOrderMixingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const recordsKey =
    productionOrderId !== null && productionOrderId !== undefined
      ? API_ROUTES.productionOrders.mixingRecords(productionOrderId)
      : null;
  const {
    data: records,
    error,
    isLoading,
    mutate,
  } = useSWR(
    recordsKey,
    () =>
      productionOrderMixingRecordsService.fetchAllByProductionOrderId(
        productionOrderId,
      ),
  );

  const { data: templates, error: templatesError, isLoading: loadingTemplates } =
    useSWR(
      isCreateOpen && itemCode
        ? API_ROUTES.items.mixingActivityTemplates(itemCode)
        : null,
      () => mixingActivityTemplatesService.fetchByItemCode(itemCode),
    );

  if (selectedRecord) {
    return (
      <ProductionOrderMixingRecordDetail
        recordId={selectedRecord.id}
        productionOrder={productionOrder}
        initialRecord={selectedRecord}
        onClose={() => {
          setSelectedRecord(null);
          void mutate();
        }}
      />
    );
  }

  const showLoadError = Boolean(error);

  const openCreateDialog = () => {
    setSelectedTemplateId("");
    setDescription(DEFAULT_DESCRIPTION);
    setIsCreateOpen(true);
  };

  const createRecord = async () => {
    const templateId = Number(selectedTemplateId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      toast.error("Vui lòng chọn một biểu mẫu pha chế.");
      return;
    }
    const normalizedDescription = description.trim();
    if (!normalizedDescription) {
      toast.error("Vui lòng nhập mô tả phiếu pha chế.");
      return;
    }

    setIsSubmitting(true);
    try {
      await productionOrderMixingRecordsService.create(
        productionOrderId,
        {
          mixing_activity_template_id: templateId,
          description: normalizedDescription,
        },
      );
      await mutate();
      setIsCreateOpen(false);
      setDescription("");
      toast.success("Đã tạo phiếu pha chế từ biểu mẫu.");
    } catch (createError) {
      toast.error(getErrorMessage(createError, "Không thể tạo phiếu pha chế."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async () => {
    if (!deletingRecord) return;

    setIsDeleting(true);
    try {
      await productionOrderMixingRecordsService.delete(deletingRecord.id);
      await mutate();
      setDeletingRecord(null);
      toast.success("Đã xóa phiếu pha chế.");
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Không thể xóa phiếu pha chế."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0"
              onClick={onClose}
              title="Quay lại chi tiết lệnh sản xuất"
              aria-label="Quay lại chi tiết lệnh sản xuất"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
                Phiếu pha chế
              </h2>
              <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
                {itemCode}
                {itemName ? ` - ${itemName}` : ""}
                {lotNumber ? ` - Lô ${lotNumber}` : ""}
              </p>
            </div>
          </div>
          {!isLoading && !error ? (
            <Button
              type="button"
              className="shrink-0 self-end bg-slate-900 text-white hover:bg-slate-800 sm:self-auto"
              onClick={openCreateDialog}
            >
              <Plus className="size-4" />
              Thêm mới
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-blue-500" />
          </div>
        ) : showLoadError ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {getErrorMessage(error, "Không thể tải phiếu pha chế.")}
          </div>
        ) : records && records.length > 0 ? (
          <div className="mt-4 divide-y border-y">
            {records.map((record) => (
              <div
                key={record.id}
                className="group flex items-stretch transition-colors hover:bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 px-3 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-slate-700" />
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {getRecordDescription(record) ||
                          "Phiếu pha chế của lệnh sản xuất"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Phiên bản {getRecordVersion(record) ?? "-"}
                        {record.created_at
                          ? ` · Tạo lúc ${formatRecordDateTime(record.created_at)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-medium text-slate-800">
                      {formatBatchSize(getRecordBatchSize(record))}{" "}
                      {getRecordUnit(record)}
                    </p>
                    <p className="mt-1 text-orange-600">
                      {getPersonLabel(record.createdBy)}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center pr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-700"
                        aria-label="Thao tác phiếu pha chế"
                        title="Thao tác phiếu pha chế"
                      >
                        <EllipsisVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDeletingRecord(record)}
                      >
                        <Trash2 className="size-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded border border-dashed px-4 text-center">
            <FileText className="size-8 text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">
              Lệnh sản xuất chưa có phiếu pha chế
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Chọn Thêm mới để tạo phiếu từ một biểu mẫu của mã hàng này.
            </p>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(deletingRecord)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa phiếu pha chế</DialogTitle>
            <DialogDescription>
              Toàn bộ giai đoạn, bước, thông số và kết quả của phiếu sẽ bị xóa.
              Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">
              Phiếu theo dõi hoạt động pha
            </p>
            <p className="mt-1 text-slate-600">
              {deletingRecord
                ? getRecordDescription(deletingRecord) ||
                  "Phiếu pha chế của lệnh sản xuất"
                : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeletingRecord(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteRecord()}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeleting ? "Đang xóa..." : "Xóa phiếu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setIsCreateOpen(open);
            if (!open) setDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo phiếu pha chế</DialogTitle>
            <DialogDescription>
              Chọn biểu mẫu của {itemCode}{itemName ? ` - ${itemName}` : ""} để
              sao chép toàn bộ giai đoạn, bước và thông số.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <label htmlFor="mixing-record-template" className="text-sm font-medium text-slate-800">
              Biểu mẫu pha chế <span className="text-red-500">*</span>
            </label>
            <select
              id="mixing-record-template"
              value={selectedTemplateId}
              disabled={isSubmitting || loadingTemplates}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {loadingTemplates ? "Đang tải biểu mẫu..." : "Chọn biểu mẫu"}
              </option>
              {(templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  Phiên bản {template.version} - {template.description || "Biểu mẫu pha chế"} - {formatBatchSize(template.batch_size)} {template.unit_of_measure}
                </option>
              ))}
            </select>
            {templatesError ? (
              <p className="text-sm text-red-600">
                {getErrorMessage(templatesError, "Không thể tải danh sách biểu mẫu.")}
              </p>
            ) : null}
            {!loadingTemplates && !templatesError && templates?.length === 0 ? (
              <p className="text-sm text-amber-700">
                Mã hàng này chưa có biểu mẫu pha chế để sử dụng.
              </p>
            ) : null}
            <label
              htmlFor="mixing-record-description"
              className="mt-2 text-sm font-medium text-slate-800"
            >
              Mô tả phiếu pha <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="mixing-record-description"
              value={description}
              rows={3}
              required
              disabled={isSubmitting}
              placeholder="Ví dụ: Phiếu pha lô sản xuất buổi sáng"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setIsCreateOpen(false);
                setDescription("");
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                isSubmitting || !selectedTemplateId || !description.trim()
              }
              onClick={() => void createRecord()}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
