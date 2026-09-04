import type { LeakTightnessCheckKey } from "./types";

type ProductionSpecificationRequirement = {
  leak_tightness_requirement?: string | number | null;
  leak_tightness?: string | number | null;
} | null | undefined;

const LEAK_TIGHTNESS_CHECK_KEYS = [
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
] as const satisfies readonly LeakTightnessCheckKey[];

const OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS = [
  "unit_2_result",
  "unit_3_result",
  "unit_4_result",
  "unit_5_result",
  "unit_6_result",
  "unit_7_result",
  "unit_8_result",
  "unit_9_result",
  "unit_10_result",
] as const satisfies readonly Exclude<LeakTightnessCheckKey, "unit_1_result">[];

const toResultValue = (value: string) => {
  if (value === "pass") {
    return true;
  }

  if (value === "fail") {
    return false;
  }

  return null;
};

const toFormResultValue = (
  value: boolean | null | undefined,
  fallback = "empty",
) => {
  if (value === true) {
    return "pass";
  }

  if (value === false) {
    return "fail";
  }

  return fallback;
};

const formatResult = (value: boolean | null | undefined) => {
  if (value === true) {
    return "Đạt/Kín";
  }

  if (value === false) {
    return "Không đạt/Không kín";
  }

  return "";
};

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

const buildLeakTightnessRequirement = (
  productionSpecification: ProductionSpecificationRequirement,
) => {
  if (!productionSpecification) {
    return "";
  }

  return formatText(
    productionSpecification.leak_tightness_requirement ??
      productionSpecification.leak_tightness,
  );
};

export {
  LEAK_TIGHTNESS_CHECK_KEYS,
  OPTIONAL_LEAK_TIGHTNESS_CHECK_KEYS,
  buildLeakTightnessRequirement,
  formatDateTime,
  formatResult,
  formatText,
  getUserLabel,
  toFormResultValue,
  toResultValue,
  type ProductionSpecificationRequirement,
};
