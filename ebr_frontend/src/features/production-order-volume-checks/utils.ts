import type { VolumeKey } from "./types";

type VolumeRequirementLimits = {
  lower_control_limit?: string | number | null;
  lower_control_limit_operator?: string | number | null;
  upper_control_limit?: string | number | null;
  upper_control_limit_operator?: string | number | null;
  lower_allowed_limit?: string | number | null;
  lower_allowed_limit_operator?: string | number | null;
  upper_allowed_limit?: string | number | null;
  upper_allowed_limit_operator?: string | number | null;
  unit?: string | number | null;
} | null | undefined;

type CylinderCalibrationNumber = string | number | null | undefined;

const VOLUME_KEYS = [
  "unit_1_volume",
  "unit_2_volume",
  "unit_3_volume",
  "unit_4_volume",
  "unit_5_volume",
  "unit_6_volume",
] as const satisfies readonly VolumeKey[];

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const toNumber = (value: string) => Number(normalizeDecimalText(value));

const parseDecimalValue = (
  value: string | number | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(String(value).trim().replace(",", "."));

  return Number.isFinite(numberValue) ? numberValue : null;
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

const DOSAGE_FORM_STAGE_LABELS: Record<string, string> = {
  tablet: "Viên nén",
  capsule: "Viên nang",
  film_coated_tablet: "Viên nén bao phim",
  oral_solution: "Dung dịch uống",
};

const formatDosageFormStage = (
  value: string | number | null | undefined,
) => {
  const text = formatText(value);

  return DOSAGE_FORM_STAGE_LABELS[text] ?? text;
};

const formatSpecificationValue = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
  cylinderCalibrationNumber?: CylinderCalibrationNumber,
) => {
  const formattedValue = formatAdjustedSpecificationValue(
    value,
    cylinderCalibrationNumber,
  );

  if (!formattedValue) {
    return "";
  }

  const numberValue = Number(normalizeDecimalText(formattedValue));
  const displayValue = Number.isNaN(numberValue)
    ? formattedValue
    : numberValue.toFixed(2);

  return [displayValue, unit || "ml"].filter(Boolean).join(" ");
};

const formatAdjustedSpecificationValue = (
  value: string | number | null | undefined,
  cylinderCalibrationNumber?: CylinderCalibrationNumber,
) => {
  const formattedValue = formatText(value);

  if (!formattedValue) {
    return "";
  }

  const numberValue = parseDecimalValue(value);
  const calibrationValue = parseDecimalValue(cylinderCalibrationNumber);

  if (numberValue === null || calibrationValue === null) {
    return formattedValue;
  }

  return (numberValue - calibrationValue).toFixed(2);
};

const reverseLowerLimitOperator = (
  operator: string | number | null | undefined,
) => {
  const normalizedOperator = String(operator ?? "").trim();

  if (normalizedOperator === ">=") {
    return "=<";
  }

  if (normalizedOperator === ">") {
    return "<";
  }

  return normalizedOperator;
};

const getLimitOperator = (
  operator: string | number | null | undefined,
  fallbackOperator: string,
) => {
  const normalizedOperator = String(operator ?? "").trim();

  return normalizedOperator || fallbackOperator;
};

const formatVariableRange = ({
  lowerOperator,
  lowerValue,
  upperOperator,
  upperValue,
}: {
  lowerOperator: string | number | null | undefined;
  lowerValue?: string;
  upperOperator: string | number | null | undefined;
  upperValue?: string;
}) =>
  [
    lowerValue,
    lowerValue ? reverseLowerLimitOperator(lowerOperator) : "",
    "m",
    upperValue ? upperOperator : "",
    upperValue,
  ]
    .filter(Boolean)
    .join(" ");

const buildVolumeRequirement = (
  limits: VolumeRequirementLimits,
  cylinderCalibrationNumber?: CylinderCalibrationNumber,
) => {
  if (!limits) {
    return "";
  }

  const lowerControlLimit = formatSpecificationValue(
    limits.lower_control_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const upperControlLimit = formatSpecificationValue(
    limits.upper_control_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const lowerAllowedLimit = formatSpecificationValue(
    limits.lower_allowed_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const upperAllowedLimit = formatSpecificationValue(
    limits.upper_allowed_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );

  const controlRange =
    lowerControlLimit || upperControlLimit
      ? `Thể tích kiểm soát ${formatVariableRange({
          lowerValue: lowerControlLimit,
          lowerOperator: getLimitOperator(
            limits.lower_control_limit_operator,
            ">",
          ),
          upperValue: upperControlLimit,
          upperOperator: getLimitOperator(
            limits.upper_control_limit_operator,
            "<",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? `Thể tích cho phép ${formatVariableRange({
          lowerValue: lowerAllowedLimit,
          lowerOperator: getLimitOperator(
            limits.lower_allowed_limit_operator,
            ">",
          ),
          upperValue: upperAllowedLimit,
          upperOperator: getLimitOperator(
            limits.upper_allowed_limit_operator,
            "<",
          ),
        })}`
      : "";

  if (!controlRange && !allowedRange) {
    return "";
  }

  return ["Tần suất kiểm tra: 30 phút/lần", controlRange, allowedRange]
    .filter(Boolean)
    .join("\n");
};

const buildPackageVolumeRequirement = (
  limits: VolumeRequirementLimits,
  cylinderCalibrationNumber?: CylinderCalibrationNumber,
) => {
  if (!limits) {
    return "";
  }

  const lowerControlLimit = formatSpecificationValue(
    limits.lower_control_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const upperControlLimit = formatSpecificationValue(
    limits.upper_control_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const lowerAllowedLimit = formatSpecificationValue(
    limits.lower_allowed_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );
  const upperAllowedLimit = formatSpecificationValue(
    limits.upper_allowed_limit,
    limits.unit,
    cylinderCalibrationNumber,
  );

  const controlRange =
    lowerControlLimit || upperControlLimit
      ? `Thể tích kiểm soát ${formatVariableRange({
          lowerValue: lowerControlLimit,
          lowerOperator: getLimitOperator(
            limits.lower_control_limit_operator,
            ">",
          ),
          upperValue: upperControlLimit,
          upperOperator: getLimitOperator(
            limits.upper_control_limit_operator,
            "<",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? `Thể tích cho phép ${formatVariableRange({
          lowerValue: lowerAllowedLimit,
          lowerOperator: getLimitOperator(
            limits.lower_allowed_limit_operator,
            ">",
          ),
          upperValue: upperAllowedLimit,
          upperOperator: getLimitOperator(
            limits.upper_allowed_limit_operator,
            "<",
          ),
        })}`
      : "";

  if (!controlRange && !allowedRange) {
    return "";
  }

  return ["Tần suất kiểm tra: 1h/lần", controlRange, allowedRange]
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
  buildPackageVolumeRequirement,
  buildVolumeRequirement,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatVolume,
  getUserLabel,
  normalizeDecimalText,
  toNumber,
  type VolumeRequirementLimits,
  VOLUME_KEYS,
};
