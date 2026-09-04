"use client";

import type { ProductionWorkshop } from "../types";

const formatDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN");
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 md:grid-cols-[180px_minmax(0,1fr)] md:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-gray-900">
        {value || "-"}
      </dd>
    </div>
  );
}

export default function ProductionWorkshopDetail({
  workshop,
}: {
  workshop?: ProductionWorkshop;
}) {
  if (!workshop) {
    return (
      <div className="w-full rounded-lg border bg-white p-4">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-white p-4">
      <div className="border-b pb-3">
        <div className="font-mono text-xs text-gray-500">{workshop.code}</div>
        <h1 className="mt-1 text-xl font-semibold">{workshop.name}</h1>
      </div>

      <dl className="mt-2">
        <DetailRow label="ID" value={workshop.id} />
        <DetailRow label="Mã xưởng" value={workshop.code} />
        <DetailRow label="Tên xưởng" value={workshop.name} />
        <DetailRow label="Mô tả" value={workshop.description} />
        <DetailRow label="Địa chỉ" value={workshop.address} />
        <DetailRow label="Ngày tạo" value={formatDateTime(workshop.created_at)} />
        <DetailRow
          label="Cập nhật"
          value={formatDateTime(workshop.updated_at)}
        />
      </dl>
    </div>
  );
}
