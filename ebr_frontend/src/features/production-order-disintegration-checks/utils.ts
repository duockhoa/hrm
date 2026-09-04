const DOSAGE_FORM_STAGE_OPTIONS = [
  { value: "tablet", label: "Viên nén" },
  { value: "film_coated_tablet", label: "Viên bao phim" },
  { value: "capsule", label: "Viên nang" },
] as const;

const UNIT_KEYS = [
  "unit_1_passed",
  "unit_2_passed",
  "unit_3_passed",
  "unit_4_passed",
  "unit_5_passed",
  "unit_6_passed",
] as const;

const formatRequirementValue = (
  value: string | number | null | undefined,
) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(String(value).trim().replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString("vi-VN", {
    maximumFractionDigits: 6,
  });
};

const buildDisintegrationRequirement = (
  specification:
    | {
        disintegration_time_control_limit?: string | number | null;
        disintegration_time_allowed_limit?: string | number | null;
        disintegration_time_unit?: string | null;
      }
    | null
    | undefined,
) => {
  if (!specification) {
    return "";
  }

  const unit = String(specification.disintegration_time_unit ?? "phút").trim() ||
    "phút";
  const controlLimit = formatRequirementValue(
    specification.disintegration_time_control_limit,
  );
  const allowedLimit = formatRequirementValue(
    specification.disintegration_time_allowed_limit,
  );

  return [
    controlLimit ? `Thời gian rã kiểm soát: ${controlLimit} ${unit}` : "",
    allowedLimit ? `Thời gian rã cho phép: ${allowedLimit} ${unit}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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

const formatDosageFormStage = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return (
    DOSAGE_FORM_STAGE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
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
  buildDisintegrationRequirement,
  DOSAGE_FORM_STAGE_OPTIONS,
  UNIT_KEYS,
  formatDateTime,
  formatDosageFormStage,
  formatPassFail,
  getPassFailClassName,
  getUserLabel,
};
