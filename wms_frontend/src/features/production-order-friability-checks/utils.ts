import type { FriabilityCheckUser } from "./types";

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const toNumber = (value: string) => Number(normalizeDecimalText(value));

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

const formatDecimal = (
  value: string | number | null | undefined,
  fractionDigits = 3,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatPercent = (value: string | number | null | undefined) =>
  formatDecimal(value, 4);

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const getUserLabel = (user: FriabilityCheckUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";

export {
  formatDateTime,
  formatDecimal,
  formatPercent,
  formatText,
  getUserLabel,
  normalizeDecimalText,
  toNumber,
};
