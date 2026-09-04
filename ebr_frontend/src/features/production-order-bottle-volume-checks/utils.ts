import type { BottleVolumeKey } from "./types";

const BOTTLE_VOLUME_KEYS = [
  "bottle_1_volume",
  "bottle_2_volume",
  "bottle_3_volume",
  "bottle_4_volume",
  "bottle_5_volume",
  "bottle_6_volume",
] as const satisfies readonly BottleVolumeKey[];

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

const formatVolume = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const getUserLabel = (
  user:
    | {
        name?: string | null;
        username?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

export {
  BOTTLE_VOLUME_KEYS,
  formatDateTime,
  formatText,
  formatVolume,
  getUserLabel,
  normalizeDecimalText,
  toNumber,
};
