"use client";

import FieldDisplay from "@/components/field-display/field-display";
import { Skeleton } from "@/components/ui/skeleton";
import type { MaintenanceRequestDetail } from "@/services/maintenance-requests.service";
import {
  equipmentStatusLabel,
  formatDateTime,
  priorities,
  priorityColors,
  requestStatusLabel,
} from "./utils";

const cardClassName =
  "flex flex-col gap-3 rounded border bg-white p-3 text-center shadow-md md:gap-4 md:p-4";

export default function MaintenanceRequestDetail({
  record,
}: {
  record?: MaintenanceRequestDetail;
}) {
  if (!record) {
    return (
      <div className="w-full max-w-4xl space-y-4" aria-label="Đang tải báo cáo sự cố">
        <div className={cardClassName}>
          <Skeleton className="mx-auto h-10 w-3/4" />
          <Skeleton className="mx-auto h-5 w-32" />
        </div>
        <div className={cardClassName}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const equipment = record.equipment;
  const reporterName = record.reporterName?.trim() || record.reporter?.name?.trim();
  const department = record.department?.trim() || record.reporter?.department?.trim();

  return (
    <div className="flex w-full max-w-4xl flex-col gap-2 md:gap-4">
      <div className={cardClassName}>
        <h1 className="break-words text-2xl font-bold leading-tight text-blue-500 md:text-3xl">
          {record.title}
        </h1>
        <p className="text-lg font-semibold text-gray-700">{record.requestCode}</p>
      </div>

      <section className={cardClassName} aria-label="Thông tin báo cáo sự cố">
        <FieldDisplay lable="Mã báo cáo" value={record.requestCode} />
        <FieldDisplay lable="Trạng thái" value={requestStatusLabel(record.status)} />
        <FieldDisplay
          lable="Mức độ ưu tiên"
          value={
            <span className={`font-semibold ${priorityColors[record.priority] ?? "text-gray-600"}`}>
              {priorities[record.priority] ?? record.priority}
            </span>
          }
        />
        <FieldDisplay lable="Nội dung sự cố" value={record.description} />
        <FieldDisplay lable="Người báo cáo" value={reporterName || "—"} />
        <FieldDisplay lable="Phòng ban" value={department || "—"} />
        <FieldDisplay lable="Ngày báo cáo" value={formatDateTime(record.createdAt)} />
        {record.rejectedReason ? (
          <FieldDisplay lable="Lý do từ chối" value={record.rejectedReason} />
        ) : null}
        {record.returnedReason ? (
          <FieldDisplay lable="Lý do trả lại" value={record.returnedReason} />
        ) : null}
        {record.cancelledReason ? (
          <FieldDisplay lable="Lý do hủy" value={record.cancelledReason} />
        ) : null}
        {record.cancelledAt ? (
          <FieldDisplay lable="Ngày hủy" value={formatDateTime(record.cancelledAt)} />
        ) : null}
      </section>

      <section className={cardClassName} aria-labelledby="incident-equipment-heading">
        <h2 id="incident-equipment-heading" className="text-left text-lg font-semibold text-gray-900">
          Thông tin thiết bị
        </h2>
        <FieldDisplay lable="Mã thiết bị" value={equipment?.code || "—"} />
        <FieldDisplay lable="Tên thiết bị" value={equipment?.name || "—"} />
        <FieldDisplay lable="Loại thiết bị" value={equipment?.category || "—"} />
        <FieldDisplay lable="Vị trí" value={equipment?.location || "—"} />
        <FieldDisplay lable="Phòng ban quản lý" value={equipment?.department || "—"} />
        <FieldDisplay lable="Trạng thái thiết bị" value={equipmentStatusLabel(equipment?.status)} />
        {equipment?.accountingCode ? (
          <FieldDisplay lable="Mã kế toán" value={equipment.accountingCode} />
        ) : null}
        {equipment?.serialNumber ? (
          <FieldDisplay lable="Số sê-ri" value={equipment.serialNumber} />
        ) : null}
      </section>

    </div>
  );
}
