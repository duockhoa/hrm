import type { TabletThicknessKey } from "./types";

type TabletThicknessSpecification = {
  tablet_thickness_control_limit?: string | number | null;
  tablet_thickness_allowed_limit?: string | number | null;
  tablet_thickness_unit?: string | null;
} | null | undefined;

const TABLET_THICKNESS_KEYS = [
  "unit_1_thickness",
  "unit_2_thickness",
  "unit_3_thickness",
  "unit_4_thickness",
  "unit_5_thickness",
  "unit_6_thickness",
  "unit_7_thickness",
  "unit_8_thickness",
  "unit_9_thickness",
  "unit_10_thickness",
] as const satisfies readonly TabletThicknessKey[];

const OPTIONAL_TABLET_THICKNESS_KEYS = TABLET_THICKNESS_KEYS.slice(1) as readonly Exclude<
  TabletThicknessKey,
  "unit_1_thickness"
>[];

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

const formatText = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const formatThickness = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numberValue = Number(String(value).replace(",", "."));

  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString("vi-VN", { maximumFractionDigits: 3 })
    : String(value);
};

const formatThicknessWithUnit = (
  value: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  const formattedThickness = formatThickness(value);

  return formattedThickness ? `${formattedThickness} ${unit || "mm"}` : "";
};

const formatDosageFormStage = (value: string | null | undefined) => {
  const labels: Record<string, string> = {
    tablet: "Viên nén",
    film_coated_tablet: "Viên nén bao phim",
    capsule: "Viên nang",
  };
  const text = formatText(value);

  return labels[text] ?? text;
};

const hasTabletThicknessSpecification = (
  specification: TabletThicknessSpecification,
) =>
  Boolean(
    specification &&
      [
        specification.tablet_thickness_control_limit,
        specification.tablet_thickness_allowed_limit,
      ].some((value) => value !== null && value !== undefined && value !== ""),
  );

const buildTabletThicknessRequirement = (
  specification: TabletThicknessSpecification,
) => {
  if (!specification) {
    return "";
  }

  const unit = specification.tablet_thickness_unit?.trim() || "mm";
  const controlLimit = formatThickness(
    specification.tablet_thickness_control_limit,
  );
  const allowedLimit = formatThickness(
    specification.tablet_thickness_allowed_limit,
  );

  return [
    controlLimit ? `Chiều dày kiểm soát: ${controlLimit} ${unit}` : "",
    allowedLimit ? `Chiều dày cho phép: ${allowedLimit} ${unit}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const getUserLabel = (
  user:
    | { name?: string | null; username?: string | null; email?: string | null }
    | null
    | undefined,
) => user?.name ?? user?.username ?? user?.email ?? "";

export {
  OPTIONAL_TABLET_THICKNESS_KEYS,
  TABLET_THICKNESS_KEYS,
  buildTabletThicknessRequirement,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatThicknessWithUnit,
  getUserLabel,
  hasTabletThicknessSpecification,
  normalizeDecimalText,
  toNumber,
  type TabletThicknessSpecification,
};
