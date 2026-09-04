import type { HardnessKey } from "./types";

type HardnessSpecificationLimits = {
  hardness_lower_control_limit?: string | number | null;
  hardness_upper_control_limit?: string | number | null;
  hardness_lower_allowed_limit?: string | number | null;
  hardness_upper_allowed_limit?: string | number | null;
  hardness_unit?: string | number | null;
} | null | undefined;

const HARDNESS_KEYS = [
  "unit_1_hardness",
  "unit_2_hardness",
  "unit_3_hardness",
  "unit_4_hardness",
  "unit_5_hardness",
  "unit_6_hardness",
  "unit_7_hardness",
  "unit_8_hardness",
  "unit_9_hardness",
  "unit_10_hardness",
] as const satisfies readonly HardnessKey[];

const OPTIONAL_HARDNESS_KEYS = [
  "unit_2_hardness",
  "unit_3_hardness",
  "unit_4_hardness",
  "unit_5_hardness",
  "unit_6_hardness",
  "unit_7_hardness",
  "unit_8_hardness",
  "unit_9_hardness",
  "unit_10_hardness",
] as const satisfies readonly Exclude<HardnessKey, "unit_1_hardness">[];

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

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const formatHardness = (value: string | number | null | undefined) => {
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

const formatHardnessWithUnit = (
  value: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  const formattedHardness = formatHardness(value);

  if (!formattedHardness) {
    return "";
  }

  return `${formattedHardness} ${unit || "N"}`;
};

const formatSpecificationLimit = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
) => {
  const formattedValue = formatText(value);

  if (!formattedValue) {
    return "";
  }

  return [formattedValue, unit || "N"].filter(Boolean).join(" ");
};

const DOSAGE_FORM_STAGE_LABELS: Record<string, string> = {
  tablet: "Viên nén",
  capsule: "Viên nang",
  film_coated_tablet: "Viên nén bao phim",
};

const formatDosageFormStage = (value: string | number | null | undefined) => {
  const text = formatText(value);

  return DOSAGE_FORM_STAGE_LABELS[text] ?? text;
};

const hasHardnessSpecificationLimits = (
  productionSpecification: HardnessSpecificationLimits,
) =>
  Boolean(
    productionSpecification &&
      [
        productionSpecification.hardness_lower_control_limit,
        productionSpecification.hardness_upper_control_limit,
        productionSpecification.hardness_lower_allowed_limit,
        productionSpecification.hardness_upper_allowed_limit,
      ].some(
        (value) => value !== null && value !== undefined && value !== "",
      ),
  );

const buildHardnessRequirement = (
  productionSpecification: HardnessSpecificationLimits,
) => {
  if (!productionSpecification) {
    return "";
  }

  const unit = "N";
  const lowerControlLimit = formatSpecificationLimit(
    productionSpecification.hardness_lower_control_limit,
    unit,
  );
  const upperControlLimit = formatSpecificationLimit(
    productionSpecification.hardness_upper_control_limit,
    unit,
  );
  const lowerAllowedLimit = formatSpecificationLimit(
    productionSpecification.hardness_lower_allowed_limit,
    unit,
  );
  const upperAllowedLimit = formatSpecificationLimit(
    productionSpecification.hardness_upper_allowed_limit,
    unit,
  );

  const formatRange = (label: string, lowerValue: string, upperValue: string) =>
    [
      label,
      lowerValue ? `từ ${lowerValue}` : "",
      upperValue ? `đến ${upperValue}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const controlRange =
    lowerControlLimit || upperControlLimit
      ? formatRange("Độ cứng kiểm soát", lowerControlLimit, upperControlLimit)
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? formatRange("Độ cứng cho phép", lowerAllowedLimit, upperAllowedLimit)
      : "";

  return ["Tần suất kiểm tra: 30 phút/lần", controlRange, allowedRange]
    .filter(Boolean)
    .join("\n");
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
  HARDNESS_KEYS,
  OPTIONAL_HARDNESS_KEYS,
  buildHardnessRequirement,
  formatDateTime,
  formatDosageFormStage,
  formatHardness,
  formatHardnessWithUnit,
  formatText,
  getUserLabel,
  hasHardnessSpecificationLimits,
  normalizeDecimalText,
  toNumber,
  type HardnessSpecificationLimits,
};
