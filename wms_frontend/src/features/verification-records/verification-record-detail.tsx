"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/api-routes";
import service from "@/services/warehouse-verification-records.service";
import {
  formatVerificationDate,
  verificationError,
} from "./verification-record-format";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value || "—"}</dd>
    </div>
  );
}

export default function VerificationRecordDetail({ id }: { id: number }) {
  const {
    data: record,
    error,
    mutate,
  } = useSWR(
    API_ROUTES.warehouseVerificationRecords.detail(id),
    () => service.read(id),
    { shouldRetryOnError: false },
  );
  const receipt = record?.warehouseReceiptItem;
  const order = record?.productionOrder;

  return (
    <section className="min-h-full overflow-hidden rounded-lg bg-white shadow-md">
      <header className="flex flex-wrap items-center gap-3 border-b p-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/verification-records">
            <ArrowLeft />
            Danh sách biên bản
          </Link>
        </Button>
        <h1 className="min-w-0 break-words text-base font-semibold">
          {record?.record_code || "Chi tiết biên bản xác minh"}
        </h1>
      </header>
      {error ? (
        <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <p role="alert">
            {verificationError(error, "Không thể tải biên bản.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      ) : !record ? (
        <p role="status" className="p-4 text-sm text-gray-500">
          Đang tải biên bản…
        </p>
      ) : (
        <div className="max-w-4xl space-y-5 p-4 sm:p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Địa điểm lập" value={record.location} />
            <Field
              label="Người lập"
              value={record.createdBy.name || record.createdBy.username}
            />
            <Field
              label="Thời điểm tạo"
              value={formatVerificationDate(record.created_at)}
            />
            <Field
              label="Cập nhật lần cuối"
              value={formatVerificationDate(record.updated_at)}
            />
          </dl>
          <section className="rounded-md border p-4">
            <h2 className="mb-3 text-sm font-semibold">
              {receipt
                ? "Hàng nhập kho"
                : order
                  ? "Lệnh sản xuất"
                  : "Đối tượng xác minh"}
            </h2>
            {receipt ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Dòng nhập kho" value={`#${receipt.id}`} />
                <Field label="Mã hàng" value={receipt.item_code} />
                <Field label="Tên hàng" value={receipt.item.item_name} />
                <Field label="Số lô" value={receipt.lot_number} />
                <Field
                  label="Thời điểm nhập"
                  value={formatVerificationDate(receipt.received_at)}
                />
              </dl>
            ) : order ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Mã lệnh"
                  value={order.production_order_code || `#${order.id}`}
                />
                <Field label="Mã hàng" value={order.item_code} />
                <Field label="Tên hàng" value={order.item.item_name} />
                <Field label="Số lô" value={order.lot_no} />
                <Field
                  label="Thời điểm tạo lệnh"
                  value={formatVerificationDate(order.creation_date)}
                />
              </dl>
            ) : (
              <p className="text-sm text-gray-600">
                Không có thông tin đối tượng.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
