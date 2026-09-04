"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import productionOrderMixingRecordsService from "@/services/production-order-mixing-records.service";
import { Check, Edit2, ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type {
  ProductionOrderMixingRecord,
  ProductionOrderMixingRecordParameter,
} from "../types";
import {
  formatRecordDateTime,
  getPersonLabel,
  getRecordBatchSize,
  getRecordDescription,
  getRecordStages,
  getRecordUnit,
  getStageSteps,
  getStepParameters,
} from "../utils";
import MixingRecordResultInput from "./mixing-record-result-input";
import MixingRecordNoteInput from "./mixing-record-note-input";
import MixingRecordParameterImageCell from "./mixing-record-parameter-image-cell";
import MixingRecordApprovals from "./mixing-record-approvals";
import MixingRecordStructureEditor from "./mixing-record-structure-editor";

const getErrorMessage = (
  error: any,
  fallback = "Không thể tải phiếu pha chế.",
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  fallback;

const formatBatchSize = (value: number | string | null) => {
  if (value === null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(parsed)
    : String(value);
};

const getRecordedBy = (parameter: ProductionOrderMixingRecordParameter) =>
  getPersonLabel(parameter.recordedBy ?? parameter.recorded_by);

export default function ProductionOrderMixingRecordDetail({
  recordId,
  productionOrder,
  initialRecord,
  onClose,
}: {
  recordId: string | number;
  productionOrder: any;
  initialRecord?: ProductionOrderMixingRecord | null;
  onClose: () => void;
}) {
  const [isEditingStructure, setIsEditingStructure] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    API_ROUTES.productionOrders.mixingRecordDetail(recordId),
    () => productionOrderMixingRecordsService.fetchById(recordId),
    {
      fallbackData: initialRecord ?? undefined,
      refreshInterval: 2_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );

  const record = data ?? initialRecord ?? null;
  const itemCode =
    productionOrder?.item_code ??
    productionOrder?.item?.item_code ??
    record?.item_code ??
    "";
  const itemName = productionOrder?.item?.item_name ?? productionOrder?.item_name ?? "";
  const lotNumber =
    productionOrder?.lot_no ??
    productionOrder?.lot_number ??
    productionOrder?.batch_number ??
    "";

  if (!record && isLoading) {
    return (
      <section className="flex min-h-56 w-full max-w-4xl items-center justify-center rounded border bg-white shadow-md">
        <Loader2 className="size-7 animate-spin text-blue-500" />
      </section>
    );
  }

  if (!record) {
    return (
      <section className="w-full max-w-4xl rounded border bg-white p-4 shadow-md">
        <Button type="button" variant="ghost" onClick={onClose}>
          <ArrowLeft className="size-5" />
          Quay lại
        </Button>
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(error)}
        </div>
      </section>
    );
  }

  const stages = getRecordStages(record);
  const productionOrderBatchSize =
    productionOrder?.planned_quatity ??
    productionOrder?.planned_quantity ??
    productionOrder?.PlannedQuantity;
  const batchSize =
    productionOrderBatchSize !== null &&
    productionOrderBatchSize !== undefined &&
    productionOrderBatchSize !== ""
      ? productionOrderBatchSize
      : getRecordBatchSize(record);
  const unit =
    String(productionOrder?.unit ?? "").trim() ||
    String(productionOrder?.item?.unit ?? "").trim() ||
    getRecordUnit(record);
  const isQaStaffApproved = Boolean(record.qa_staff_approved_at);
  const isParameterEntryDisabled = !isQaStaffApproved;
  const isStructureEditorOpen = isEditingStructure && !isQaStaffApproved;

  const openDescriptionEditor = () => {
    setDescriptionDraft(record.description ?? "");
    setIsDescriptionOpen(true);
  };

  const saveDescription = async () => {
    setIsSavingDescription(true);
    try {
      await productionOrderMixingRecordsService.update(record.id, {
        description: descriptionDraft.trim() || null,
      });
      await mutate();
      setIsDescriptionOpen(false);
      toast.success("Đã cập nhật mô tả phiếu pha chế.");
    } catch (updateError) {
      toast.error(
        getErrorMessage(updateError, "Không thể cập nhật mô tả phiếu pha chế."),
      );
    } finally {
      setIsSavingDescription(false);
    }
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded border bg-white shadow-md">
      <div className="flex items-start gap-2 border-b p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={onClose}
          title="Quay lại danh sách phiếu pha chế"
          aria-label="Quay lại danh sách phiếu pha chế"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
              Chi tiết phiếu pha chế
            </h2>
            {isValidating ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-blue-400" />
            ) : null}
          </div>
          <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
            {itemCode}
            {itemName ? ` - ${itemName}` : ""}
            {lotNumber ? ` - Lô ${lotNumber}` : ""}
          </p>
        </div>
        {!isQaStaffApproved ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="font-sans"
              onClick={openDescriptionEditor}
            >
              <Edit2 className="size-4" />
              Mô tả
            </Button>
            <Button
              type="button"
              variant={isEditingStructure ? "default" : "outline"}
              className="font-sans"
              onClick={() => setIsEditingStructure((current) => !current)}
            >
              {isEditingStructure ? (
                <Check className="size-4" />
              ) : (
                <Edit2 className="size-4" />
              )}
              {isEditingStructure ? "Hoàn tất" : "Chỉnh sửa"}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Dữ liệu gần nhất vẫn đang được hiển thị. {getErrorMessage(error)}
        </div>
      ) : null}

      <div className="overflow-x-auto bg-gray-50 p-2 sm:p-3">
        <div
          className="min-w-[760px] bg-white text-[15px] leading-6 text-black antialiased [text-rendering:optimizeLegibility]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <table className="w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <td rowSpan={3} className="h-40 border border-black p-4 align-middle">
                  <div className="flex h-full items-center justify-center">
                    <Image
                      src="/dkpharmalogo.png"
                      alt="DK Pharma"
                      width={130}
                      height={64}
                      className="h-auto max-h-16 w-auto object-contain"
                      priority
                    />
                  </div>
                </td>
                <td
                  rowSpan={3}
                  className="h-40 border border-black px-6 py-3 text-center align-middle text-xl font-bold uppercase leading-8"
                >
                  Theo dõi quá trình
                  <br />
                  Pha chế
                </td>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Mã hiệu: BMDB004.01
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Ngày ban hành:
                  <br />
                  23/08/2026
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Lần ban hành: 02
                </td>
              </tr>
            </tbody>
          </table>

          {isParameterEntryDisabled ? (
            <div
              role="status"
              className="mt-6 border border-amber-300 bg-amber-50 px-3 py-2 font-sans text-sm font-medium text-amber-900"
            >
              Chưa thể nhập thông số. Nhân viên ĐBCL cần ký duyệt phiếu trước
              khi nhập kết quả thực tế, ghi chú hoặc hình ảnh.
            </div>
          ) : null}

          {isStructureEditorOpen ? (
            <MixingRecordStructureEditor
              record={record}
              parameterEntryDisabled={isParameterEntryDisabled}
              onChanged={() => mutate()}
            />
          ) : (
          <table className="mt-6 w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[168px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[180px]" />
            </colgroup>
            <tbody>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Tên sản phẩm:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold">
                  {itemName}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Mã sản phẩm:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold">
                  {itemCode}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Cỡ lô:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold">
                  {formatBatchSize(batchSize)} {unit}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Số lô:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle font-bold">
                  {lotNumber}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Mô tả:
                </th>
                <td colSpan={3} className="h-12 whitespace-pre-wrap break-words border border-black px-2 py-2 align-middle">
                  {getRecordDescription(record)}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Người tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle">
                  {getPersonLabel(record.createdBy)}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Ngày tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle">
                  {formatRecordDateTime(record.created_at)}
                </td>
              </tr>
            </tbody>
          </table>
          )}

          <table className="mt-6 w-full table-fixed border-collapse border border-black">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[33%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold">
                  Nội dung kiểm tra
                </th>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold">
                  Yêu cầu
                </th>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold">
                  Thực tế
                </th>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold leading-5">
                  Ghi chú
                </th>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold leading-5">
                  Hình ảnh
                </th>
                <th className="border border-black px-2 py-3 text-center align-middle font-bold leading-5">
                  Người thực hiện
                </th>
              </tr>
            </thead>
            <tbody>
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black px-3 py-8 text-center text-gray-500">
                    Phiếu chưa có giai đoạn pha chế.
                  </td>
                </tr>
              ) : (
                stages.map((stage) => {
                  const steps = getStageSteps(stage);
                  return [
                    <tr key={`stage-${stage.id}`}>
                      <td colSpan={6} className="border border-black px-2 py-2 font-semibold">
                        Giai đoạn {stage.stage_order}: {stage.stage_name}
                      </td>
                    </tr>,
                    ...steps.flatMap((step) => {
                      const parameters = getStepParameters(step);
                      if (parameters.length === 0) {
                        return [
                          <tr key={`step-${step.id}`}>
                            <td className="border border-black px-2 py-2 align-top">
                              Bước {step.step_order}: {step.step_name}
                            </td>
                            <td className="border border-black px-2 py-2" />
                            <td className="border border-black px-2 py-2" />
                            <td className="border border-black px-2 py-2" />
                            <td className="border border-black px-2 py-2" />
                            <td className="border border-black px-2 py-2" />
                          </tr>,
                        ];
                      }

                      return parameters.map((parameter, parameterIndex) => (
                        <tr key={`parameter-${parameter.id}`}>
                          {parameterIndex === 0 ? (
                            <td
                              rowSpan={parameters.length}
                              className="border border-black px-2 py-2 align-top"
                            >
                              Bước {step.step_order}: {step.step_name}
                            </td>
                          ) : null}
                          <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">
                            <span className="font-semibold">{parameter.parameter_name}:</span>{" "}
                            {parameter.requirement}
                          </td>
                          <td className="border border-black p-0 align-middle">
                            <MixingRecordResultInput
                              key={`${parameter.id}-${String(parameter.result_value)}`}
                              parameter={parameter}
                              disabled={isParameterEntryDisabled}
                              onSaved={() => mutate()}
                            />
                          </td>
                          <td className="border border-black p-0 align-middle">
                            <MixingRecordNoteInput
                              key={`${parameter.id}-${parameter.note ?? ""}`}
                              parameter={parameter}
                              disabled={isParameterEntryDisabled}
                              onSaved={() => mutate()}
                            />
                          </td>
                          <td className="border border-black p-0 align-middle">
                            <MixingRecordParameterImageCell
                              parameter={parameter}
                              readOnly={isParameterEntryDisabled}
                              onChanged={() => mutate()}
                            />
                          </td>
                          <td className="break-words border border-black px-2 py-2 text-center align-middle text-sm leading-5">
                            {getRecordedBy(parameter)}
                            {parameter.recorded_at ? (
                              <span className="mt-1 block text-xs text-gray-600">
                                {formatRecordDateTime(parameter.recorded_at)}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ));
                    }),
                  ];
                })
              )}
            </tbody>
          </table>

          <MixingRecordApprovals record={record} onChanged={() => mutate()} />
        </div>
      </div>

      <Dialog
        open={isDescriptionOpen}
        onOpenChange={(open) => {
          if (!isSavingDescription) setIsDescriptionOpen(open);
        }}
      >
        <DialogContent className="font-sans sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sửa mô tả phiếu pha chế</DialogTitle>
            <DialogDescription>
              Có thể để trống nội dung để xóa mô tả hiện tại.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={descriptionDraft}
            rows={4}
            disabled={isSavingDescription}
            placeholder="Nhập mô tả phiếu pha chế"
            autoFocus
            onChange={(event) => setDescriptionDraft(event.target.value)}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSavingDescription}
              onClick={() => setIsDescriptionOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={isSavingDescription}
              onClick={() => void saveDescription()}
            >
              {isSavingDescription ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
