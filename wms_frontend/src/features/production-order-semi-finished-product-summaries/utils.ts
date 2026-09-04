import type { SemiFinishedProductSummaryUser } from "./types";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  });
};

const formatQuantityWithUnit = (
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  const formattedQuantity = formatNumber(quantity);

  if (!formattedQuantity) {
    return unit ?? "";
  }

  return [formattedQuantity, unit].filter(Boolean).join(" ");
};

const formatText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const getUserLabel = (
  user: SemiFinishedProductSummaryUser | null | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

export {
  formatDateTime,
  formatNumber,
  formatQuantityWithUnit,
  formatText,
  getUserLabel,
};
