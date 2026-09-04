import type { SprayDoseKey } from "./types";

type SprayDoseSpecificationLimits = {
  spray_dose_lower_allowed_limit?: string | number | null;
  spray_dose_upper_allowed_limit?: string | number | null;
  spray_dose_lower_control_limit?: string | number | null;
  spray_dose_upper_control_limit?: string | number | null;
} | null | undefined;

const SPRAY_DOSE_KEYS = [
  "bottle_1_spray_dose_count",
  "bottle_2_spray_dose_count",
  "bottle_3_spray_dose_count",
  "bottle_4_spray_dose_count",
  "bottle_5_spray_dose_count",
  "bottle_6_spray_dose_count",
] as const satisfies readonly SprayDoseKey[];

const OPTIONAL_SPRAY_DOSE_KEYS = [
  "bottle_2_spray_dose_count",
  "bottle_3_spray_dose_count",
  "bottle_4_spray_dose_count",
  "bottle_5_spray_dose_count",
  "bottle_6_spray_dose_count",
] as const satisfies readonly Exclude<
  SprayDoseKey,
  "bottle_1_spray_dose_count"
>[];

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

const formatDoseCount = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });
};

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const buildSprayDoseRequirement = (
  specification: SprayDoseSpecificationLimits,
) => {
  if (!specification) {
    return "";
  }

  const lowerControlLimit = formatText(
    specification.spray_dose_lower_control_limit,
  );
  const upperControlLimit = formatText(
    specification.spray_dose_upper_control_limit,
  );
  const lowerAllowedLimit = formatText(
    specification.spray_dose_lower_allowed_limit,
  );
  const upperAllowedLimit = formatText(
    specification.spray_dose_upper_allowed_limit,
  );

  const formatRange = (label: string, lowerValue: string, upperValue: string) =>
    [
      label,
      lowerValue ? `từ ${lowerValue} liều` : "",
      upperValue ? `đến ${upperValue} liều` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const controlRange =
    lowerControlLimit || upperControlLimit
      ? formatRange(
          "Số liều xịt kiểm soát",
          lowerControlLimit,
          upperControlLimit,
        )
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? formatRange(
          "Số liều xịt cho phép",
          lowerAllowedLimit,
          upperAllowedLimit,
        )
      : "";

  return [controlRange, allowedRange].filter(Boolean).join("\n");
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
  OPTIONAL_SPRAY_DOSE_KEYS,
  SPRAY_DOSE_KEYS,
  buildSprayDoseRequirement,
  formatDateTime,
  formatDoseCount,
  formatText,
  getUserLabel,
  type SprayDoseSpecificationLimits,
};
