import type { CylinderCalibrationUser } from "./types";

export const normalizeDecimalText = (value: string) =>
  value.trim().replace(",", ".");

export const formatDateTime = (value: string | null | undefined) => {
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

export const formatCalibrationNumber = (
  value: string | number | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(String(value).replace(",", "."));

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
};

export const getUserLabel = (user: CylinderCalibrationUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "";
