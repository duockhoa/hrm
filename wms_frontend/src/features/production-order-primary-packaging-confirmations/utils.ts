import type { PrimaryPackagingConfirmation } from "./types";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConfirmationResult = (value: boolean) =>
  value ? "Đạt" : "Không đạt";

const getConfirmationUserLabel = (
  user: PrimaryPackagingConfirmation["createdBy"],
) => user?.name ?? user?.username ?? user?.email ?? "-";

export {
  formatConfirmationResult,
  formatDateTime,
  getConfirmationUserLabel,
};
