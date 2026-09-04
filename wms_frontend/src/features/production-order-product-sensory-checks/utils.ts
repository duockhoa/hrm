import type { UnitSensoryResultKey } from "./types";

const UNIT_RESULT_KEYS = [
  "unit_1_result",
  "unit_2_result",
  "unit_3_result",
  "unit_4_result",
  "unit_5_result",
  "unit_6_result",
  "unit_7_result",
  "unit_8_result",
  "unit_9_result",
  "unit_10_result",
] as const satisfies readonly UnitSensoryResultKey[];

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

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
};

const PRODUCT_SENSORY_DOSAGE_FORM_STAGE_LABELS: Record<string, string> = {
  tablet: "Viên nén",
  capsule: "Viên nang",
  film_coated_tablet: "Viên nén bao phim",
  granule_package: "Gói cốm",
  bottle: "Lọ",
};

const formatDosageFormStage = (
  value: string | number | null | undefined,
) => {
  const text = formatText(value);

  return PRODUCT_SENSORY_DOSAGE_FORM_STAGE_LABELS[text] ?? text;
};

const formatPassFail = (value: boolean | null | undefined) => {
  if (value === true) {
    return "Đạt";
  }

  if (value === false) {
    return "Không đạt";
  }

  return "";
};

const getPassFailClassName = (value: boolean | null | undefined) => {
  if (value === true) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (value === false) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
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
  UNIT_RESULT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatPassFail,
  formatText,
  getPassFailClassName,
  getUserLabel,
};
