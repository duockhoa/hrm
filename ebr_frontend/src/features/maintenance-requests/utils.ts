import { isAxiosError } from "axios";
import type { Priority } from "@/services/maintenance-requests.service";

export const priorities: Record<Priority, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};
export const priorityColors: Record<Priority, string> = {
  LOW: "text-gray-600",
  MEDIUM: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
};

const requestStatuses: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  RETURNED: "Đã trả lại",
  CANCELLED: "Đã hủy",
  CLOSED: "Đã đóng",
};

const equipmentStatuses: Record<string, string> = {
  OPERATIONAL: "Đang hoạt động",
  INCIDENT: "Có sự cố",
  MAINTENANCE: "Đang bảo trì",
};

const workOrderStatuses: Record<string, string> = {
  PENDING: "Chờ xử lý",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn thành",
  VERIFIED: "Đã xác nhận",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

export const requestStatusLabel = (status: string) =>
  requestStatuses[status] ?? status;
export const equipmentStatusLabel = (status?: string) =>
  status ? equipmentStatuses[status] ?? status : "—";
export const workOrderStatusLabel = (status: string) =>
  workOrderStatuses[status] ?? status;

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export const isRequestLocked = (record: {
  status: string;
  workOrders?: { id: string }[];
}) => record.status === "CLOSED" || Boolean(record.workOrders?.length);
export function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("; ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error
    ? error.message
    : "Thao tác không thành công. Vui lòng thử lại.";
}

