"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useWeighingRecordSocket } from "../use-weighing-record-socket";
import { Check, Edit2, Plus } from "lucide-react";
import WeighingRecordMaterials from "./weighing-record-materials";
import WeighingRecordApprovals from "./weighing-record-approvals";
import useSWR, { useSWRConfig } from "swr";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecord,
  WeighingProductionOrder,
} from "../types";

const FORM_CODE = "BMDB005.01";
const ISSUE_DATE = "24/10/2026";
const ISSUE_VERSION = "02";

const formatBatchSize = (value?: number | string | null) => {
  if (value == null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 }).format(
        parsed,
      )
    : String(value);
};

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")}:${part("second")} ${part("day")}/${part("month")}/${part("year")}`;
};

export default function ProductionOrderWeighingRecordDetail({
  record: initialRecord,
  productionOrder,
  onClose,
}: {
  record: ProductionOrderWeighingRecord;
  productionOrder: WeighingProductionOrder;
  onClose: () => void;
}) {
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data: record = initialRecord, mutate } = useSWR(
    API_ROUTES.productionOrders.weighingRecordDetail(initialRecord.id),
    () => service.fetchById(initialRecord.id),
    { fallbackData: initialRecord },
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const base = API_ROUTES.productionOrders.weighingRecordDetail(
    initialRecord.id,
  );
  const { connected, requestRefresh } = useWeighingRecordSocket(
    initialRecord.id,
    async () => {
      const results = await Promise.allSettled([
        mutate(),
        mutateGlobal(`${base}/lines`),
        mutateGlobal(`${base}/stages`),
        mutateGlobal(`${base}/source-materials`),
        mutateGlobal(
          (key) =>
            typeof key === "string" &&
            key.startsWith(`${base}/lines/`) &&
            key.endsWith("/details"),
        ),
        mutateGlobal(
          API_ROUTES.productionOrders.weighingRecords(
            initialRecord.production_order_id,
          ),
        ),
      ]);
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    },
    () => {
      toast.info("Phiếu cân đã bị xóa hoặc không còn tồn tại.");
      void mutateGlobal(
        API_ROUTES.productionOrders.weighingRecords(
          initialRecord.production_order_id,
        ),
      );
      onClose();
    },
  );
  const locked =
    record.status === "approved" || Boolean(record.ipc_staff_approved_at);
  const weighingLocked =
    !record.qa_staff_approved_at ||
    Boolean(record.ipc_staff_approved_at) ||
    record.status === "approved";
  const itemCode =
    productionOrder.item_code ?? productionOrder.item?.item_code ?? "";
  const itemName =
    productionOrder.item?.item_name ?? productionOrder.item_name ?? "";
  const lotNumber =
    productionOrder.lot_no ??
    productionOrder.lot_number ??
    productionOrder.batch_number ??
    "";
  const batchSize =
    productionOrder.planned_quatity ??
    productionOrder.planned_quantity ??
    productionOrder.PlannedQuantity;
  const unit =
    productionOrder.unit?.trim() || productionOrder.item?.unit?.trim() || "";

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded border bg-white shadow-md">
      <div className="flex items-start gap-2 border-b p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 shrink-0"
          onClick={onClose}
          title="Quay lại danh sách phiếu cân"
          aria-label="Quay lại danh sách phiếu cân"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
            Chi tiết phiếu cân
          </h2>
          <p className="mt-2 break-words text-sm font-medium text-gray-600 md:text-base">
            {itemCode}
            {itemName ? ` - ${itemName}` : ""}
            {lotNumber ? ` - Lô ${lotNumber}` : ""}
          </p>
        </div>
        {!locked ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant={isEditing ? "default" : "outline"}
              aria-pressed={isEditing}
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? (
                <Check className="size-4" />
              ) : (
                <Edit2 className="size-4" />
              )}
              {isEditing ? "Hoàn tất" : "Sửa"}
            </Button>
            <Button
              type="button"
              className="shrink-0 bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => setIsImportOpen(true)}
            >
              <Plus className="size-4" />
              Thêm mới
            </Button>
          </div>
        ) : null}
      </div>
      {!connected ? (
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-sm text-slate-500 print:hidden">
          <span>Đang kết nối cập nhật trực tiếp...</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void requestRefresh()}
          >
            Làm mới
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto bg-gray-50 p-2 sm:p-3">
        <div
          className="min-w-[760px] bg-white text-[15px] leading-6 text-black antialiased [text-rendering:optimizeLegibility] print:min-w-0"
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
                <td
                  rowSpan={3}
                  className="h-40 border border-black p-4 align-middle"
                >
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
                  Phiếu cân
                </td>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Mã hiệu: {FORM_CODE}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Ngày ban hành:
                  <br />
                  {ISSUE_DATE}
                </td>
              </tr>
              <tr>
                <td className="h-[52px] border border-black px-2 py-1.5 align-middle leading-5">
                  Lần ban hành: {ISSUE_VERSION}
                </td>
              </tr>
            </tbody>
          </table>
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
                <td className="h-12 break-words border border-black px-2 py-2 align-middle font-bold">
                  {itemName}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Mã sản phẩm:
                </th>
                <td className="h-12 break-words border border-black px-2 py-2 align-middle font-bold">
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
                <td className="h-12 break-words border border-black px-2 py-2 align-middle font-bold">
                  {lotNumber}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Mô tả:
                </th>
                <td
                  colSpan={3}
                  className="h-12 whitespace-pre-wrap break-words border border-black px-2 py-2 align-middle"
                >
                  {record.description || "—"}
                </td>
              </tr>
              <tr>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Người tạo:
                </th>
                <td className="h-12 break-words border border-black px-2 py-2 align-middle">
                  {record.createdBy?.name || record.createdBy?.username || "—"}
                </td>
                <th className="h-12 border border-black px-2 py-2 text-left align-middle font-semibold">
                  Ngày tạo:
                </th>
                <td className="h-12 border border-black px-2 py-2 align-middle">
                  {formatCreatedAt(record.created_at)}
                </td>
              </tr>
            </tbody>
          </table>
          <WeighingRecordMaterials
            recordId={record.id}
            isImportOpen={isImportOpen}
            onImportOpenChange={setIsImportOpen}
            locked={locked}
            weighingLocked={weighingLocked}
            onChanged={requestRefresh}
            isEditing={isEditing && !locked}
          />
          <WeighingRecordApprovals
            record={record}
            onChanged={async (updated) => {
              await mutate(updated, { revalidate: false });
              await requestRefresh();
              void mutateGlobal(
                API_ROUTES.productionOrders.weighingRecords(
                  updated.production_order_id,
                ),
              ).catch(() => undefined);
            }}
          />
        </div>
      </div>
    </section>
  );
}
