import type { ShellWeightKey } from "./types";

const SHELL_WEIGHT_KEYS = [
  "shell_1_weight",
  "shell_2_weight",
  "shell_3_weight",
  "shell_4_weight",
  "shell_5_weight",
  "shell_6_weight",
  "shell_7_weight",
  "shell_8_weight",
  "shell_9_weight",
  "shell_10_weight",
] as const satisfies readonly ShellWeightKey[];

const SHELL_WEIGHT_UNIT = "g";

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

const formatWeight = (value: string | number | null | undefined) => {
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
  SHELL_WEIGHT_KEYS,
  SHELL_WEIGHT_UNIT,
  formatDateTime,
  formatText,
  formatWeight,
  getUserLabel,
  normalizeDecimalText,
  toNumber,
};
