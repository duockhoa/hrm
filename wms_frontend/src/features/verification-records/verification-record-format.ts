import { isAxiosError } from "axios";
import type { VerificationRecord } from "@/services/warehouse-verification-records.service";

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});
const dayFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function formatVerificationDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatVerificationDay(value: string) {
  return dayFormatter.format(new Date(value));
}

export function formatVerificationTime(value: string) {
  return timeFormatter.format(new Date(value));
}

export function verificationError(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message: unknown = error.response?.data?.message;
    if (status === 403) {
      return typeof message === "string" && message !== "Forbidden resource"
        ? message
        : "Bạn chưa có quyền truy cập.";
    }
    if (status && status < 500 && typeof message === "string") return message;
  }
  return fallback;
}

export function recordSubjectLabel(record: VerificationRecord) {
  const receipt = record.warehouseReceiptItem;
  if (receipt)
    return `Hàng nhập kho · ${receipt.item_code} · Lô ${receipt.lot_number}`;
  const order = record.productionOrder;
  if (order)
    return `Lệnh sản xuất · ${order.production_order_code || "#" + order.id}`;
  return "—";
}
