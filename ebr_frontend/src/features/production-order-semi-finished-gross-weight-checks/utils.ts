import type { SemiFinishedGrossWeightKey } from "./types";

type ProductionSpecificationLimits = {
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

type ShellWeightCheckForRequirement = {
  id?: string | number | null;
  created_at?: string | null;
  unit?: string | null;
  shell_1_weight?: string | number | null;
  shell_2_weight?: string | number | null;
  shell_3_weight?: string | number | null;
  shell_4_weight?: string | number | null;
  shell_5_weight?: string | number | null;
  shell_6_weight?: string | number | null;
  shell_7_weight?: string | number | null;
  shell_8_weight?: string | number | null;
  shell_9_weight?: string | number | null;
  shell_10_weight?: string | number | null;
};

type DensityCheckForRequirement = {
  id?: string | number | null;
  created_at?: string | null;
  density?: string | number | null;
};

type TenShellWeightCheckForRequirement = {
  ten_shells_weight?: string | number | null;
  unit?: string | null;
} | null | undefined;

const SEMI_FINISHED_GROSS_WEIGHT_KEYS = [
  "unit_1_gross_weight",
  "unit_2_gross_weight",
  "unit_3_gross_weight",
  "unit_4_gross_weight",
  "unit_5_gross_weight",
  "unit_6_gross_weight",
  "unit_7_gross_weight",
  "unit_8_gross_weight",
  "unit_9_gross_weight",
  "unit_10_gross_weight",
] as const satisfies readonly SemiFinishedGrossWeightKey[];

const OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS = [
  "unit_2_gross_weight",
  "unit_3_gross_weight",
  "unit_4_gross_weight",
  "unit_5_gross_weight",
  "unit_6_gross_weight",
  "unit_7_gross_weight",
  "unit_8_gross_weight",
  "unit_9_gross_weight",
  "unit_10_gross_weight",
] as const satisfies readonly Exclude<
  SemiFinishedGrossWeightKey,
  "unit_1_gross_weight"
>[];

const SHELL_WEIGHT_KEYS_FOR_REQUIREMENT = [
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
] as const;

const normalizeDecimalText = (value: string) => value.trim().replace(",", ".");

const toNumber = (value: string) => Number(normalizeDecimalText(value));

const parseDecimal = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(normalizeDecimalText(String(value)));

  return Number.isNaN(numberValue) ? null : numberValue;
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

const formatWeight = (value: string | number | null | undefined) => {
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

const formatText = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const SEMI_FINISHED_GROSS_WEIGHT_DOSAGE_FORM_STAGE_LABELS: Record<
  string,
  string
> = {
  tablet: "Viên nén",
  capsule: "Viên nang",
  film_coated_tablet: "Viên nén bao phim",
  granule_package: "Gói cốm",
  solution_package: "Gói dịch",
};

const formatDosageFormStage = (
  value: string | number | null | undefined,
) => {
  const text = formatText(value);

  return SEMI_FINISHED_GROSS_WEIGHT_DOSAGE_FORM_STAGE_LABELS[text] ?? text;
};

const normalizeUnit = (
  unit: string | number | null | undefined,
  fallbackUnit: "g" | "mg",
) => formatText(unit || fallbackUnit).trim().toLowerCase();

const getGramFactor = (
  unit: string | number | null | undefined,
  fallbackUnit: "g" | "mg",
) => {
  const normalizedUnit = normalizeUnit(unit, fallbackUnit);

  if (["mg", "milligram", "milligrams"].includes(normalizedUnit)) {
    return 0.001;
  }

  if (["kg", "kilogram", "kilograms"].includes(normalizedUnit)) {
    return 1000;
  }

  if (["mcg", "µg", "ug", "microgram", "micrograms"].includes(normalizedUnit)) {
    return 0.000001;
  }

  return 1;
};

const convertWeightToGram = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
  fallbackUnit: "g" | "mg",
) => {
  const numericValue = parseDecimal(value);

  if (numericValue === null) {
    return null;
  }

  return numericValue * getGramFactor(unit, fallbackUnit);
};

const formatGramValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return `${value.toFixed(3)} g`;
};

const formatGramValueTwoDecimals = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return `${value.toFixed(2)} g`;
};

const formatMilligramValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return `${value.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  })} mg`;
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

const getLatestShellWeightCheck = (
  shellWeightChecks: ShellWeightCheckForRequirement[] | undefined,
) => {
  if (!shellWeightChecks || shellWeightChecks.length === 0) {
    return null;
  }

  return [...shellWeightChecks].sort((first, second) => {
    const firstTime = first.created_at
      ? new Date(first.created_at).getTime()
      : 0;
    const secondTime = second.created_at
      ? new Date(second.created_at).getTime()
      : 0;

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    return Number(second.id ?? 0) - Number(first.id ?? 0);
  })[0];
};

const getLatestShellWeightAverageGram = (
  shellWeightChecks: ShellWeightCheckForRequirement[] | undefined,
) => {
  const latestShellWeightCheck = getLatestShellWeightCheck(shellWeightChecks);

  if (!latestShellWeightCheck) {
    return null;
  }

  const shellWeightsInGram = SHELL_WEIGHT_KEYS_FOR_REQUIREMENT.map((key) =>
    convertWeightToGram(latestShellWeightCheck[key], latestShellWeightCheck.unit, "mg"),
  ).filter((value): value is number => value !== null);

  if (shellWeightsInGram.length === 0) {
    return null;
  }

  return (
    shellWeightsInGram.reduce((total, value) => total + value, 0) /
    shellWeightsInGram.length
  );
};

const getLatestCompleteShellWeightAverageGram = (
  shellWeightChecks: ShellWeightCheckForRequirement[] | undefined,
) => {
  const latestShellWeightCheck = getLatestShellWeightCheck(shellWeightChecks);

  if (!latestShellWeightCheck) {
    return null;
  }

  const shellWeightsInGram = SHELL_WEIGHT_KEYS_FOR_REQUIREMENT.map((key) =>
    convertWeightToGram(
      latestShellWeightCheck[key],
      latestShellWeightCheck.unit,
      "g",
    ),
  );

  if (shellWeightsInGram.some((weight) => weight === null)) {
    return null;
  }

  const completeShellWeightsInGram = shellWeightsInGram.filter(
    (weight): weight is number => weight !== null,
  );

  return (
    completeShellWeightsInGram.reduce((total, weight) => total + weight, 0) /
    completeShellWeightsInGram.length
  );
};

const getLatestDensityValue = (
  densityChecks: DensityCheckForRequirement[] | undefined,
) => {
  if (!densityChecks || densityChecks.length === 0) {
    return null;
  }

  const latestDensityCheck = [...densityChecks].sort((first, second) => {
    const firstTime = first.created_at
      ? new Date(first.created_at).getTime()
      : 0;
    const secondTime = second.created_at
      ? new Date(second.created_at).getTime()
      : 0;

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    return Number(second.id ?? 0) - Number(first.id ?? 0);
  })[0];

  return parseDecimal(latestDensityCheck?.density);
};

const getTenShellWeightAverageMilligram = (
  tenShellWeightCheck: TenShellWeightCheckForRequirement,
) => {
  const tenShellWeightInGram = convertWeightToGram(
    tenShellWeightCheck?.ten_shells_weight,
    tenShellWeightCheck?.unit,
    "mg",
  );

  if (tenShellWeightInGram === null) {
    return null;
  }

  return (tenShellWeightInGram * 1000) / 10;
};

const hasProductionSpecificationLimits = (
  productionSpecification: ProductionSpecificationLimits,
) =>
  Boolean(
    productionSpecification &&
      [
        productionSpecification.lower_control_limit,
        productionSpecification.upper_control_limit,
        productionSpecification.lower_allowed_limit,
        productionSpecification.upper_allowed_limit,
      ].some(
        (value) => value !== null && value !== undefined && value !== "",
      ),
  );

const buildSemiFinishedGrossWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  latestShellWeightAverageGram: number | null | undefined,
) => {
  if (!productionSpecification || latestShellWeightAverageGram == null) {
    return "";
  }

  const lowerControlLimit = convertWeightToGram(
    productionSpecification.lower_control_limit,
    productionSpecification.unit,
    "g",
  );
  const upperControlLimit = convertWeightToGram(
    productionSpecification.upper_control_limit,
    productionSpecification.unit,
    "g",
  );
  const lowerAllowedLimit = convertWeightToGram(
    productionSpecification.lower_allowed_limit,
    productionSpecification.unit,
    "g",
  );
  const upperAllowedLimit = convertWeightToGram(
    productionSpecification.upper_allowed_limit,
    productionSpecification.unit,
    "g",
  );

  const controlRange =
    lowerControlLimit !== null || upperControlLimit !== null
      ? `Khối lượng kiểm soát cả gói ${formatVariableRange({
          lowerValue:
            lowerControlLimit === null
              ? ""
              : formatGramValue(
                  lowerControlLimit + latestShellWeightAverageGram,
                ),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_control_limit_operator,
            ">=",
          ),
          upperValue:
            upperControlLimit === null
              ? ""
              : formatGramValue(
                  upperControlLimit + latestShellWeightAverageGram,
                ),
          upperOperator: getLimitOperator(
            productionSpecification.upper_control_limit_operator,
            "<=",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit !== null || upperAllowedLimit !== null
      ? `Khối lượng cho phép cả vỏ ${formatVariableRange({
          lowerValue:
            lowerAllowedLimit === null
              ? ""
              : formatGramValue(
                  lowerAllowedLimit + latestShellWeightAverageGram,
                ),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_allowed_limit_operator,
            ">=",
          ),
          upperValue:
            upperAllowedLimit === null
              ? ""
              : formatGramValue(
                  upperAllowedLimit + latestShellWeightAverageGram,
                ),
          upperOperator: getLimitOperator(
            productionSpecification.upper_allowed_limit_operator,
            "<=",
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

const buildSemiFinishedSolutionPackageGrossWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  latestShellWeightAverageGram: number | null | undefined,
  density: number | null | undefined,
  containerLabel = "gói dịch",
) => {
  if (!productionSpecification || latestShellWeightAverageGram == null) {
    return "";
  }

  const convertLimitToGram = (
    value: string | number | null | undefined,
  ) => {
    const numericValue = parseDecimal(value);

    if (numericValue === null) {
      return null;
    }

    const unit = normalizeUnit(productionSpecification.unit, "g");

    if (unit === "g" || unit === "gram" || unit === "grams") {
      return numericValue;
    }

    if (unit === "mg" || unit === "milligram" || unit === "milligrams") {
      return numericValue / 1000;
    }

    if (density == null) {
      return null;
    }

    return (unit === "l" || unit === "liter" || unit === "liters"
      ? numericValue * 1000
      : numericValue) * density * 0.996;
  };

  const lowerControlLimit = convertLimitToGram(
    productionSpecification.lower_control_limit,
  );
  const upperControlLimit = convertLimitToGram(
    productionSpecification.upper_control_limit,
  );
  const lowerAllowedLimit = convertLimitToGram(
    productionSpecification.lower_allowed_limit,
  );
  const upperAllowedLimit = convertLimitToGram(
    productionSpecification.upper_allowed_limit,
  );
  const calculateGrossWeight = (limit: number) =>
    limit + latestShellWeightAverageGram;

  const controlRange =
    lowerControlLimit !== null || upperControlLimit !== null
      ? `Khối lượng kiểm soát ${containerLabel} ${formatVariableRange({
          lowerValue:
            lowerControlLimit === null
              ? ""
              : formatGramValueTwoDecimals(
                  calculateGrossWeight(lowerControlLimit),
                ),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_control_limit_operator,
            ">",
          ),
          upperValue:
            upperControlLimit === null
              ? ""
              : formatGramValueTwoDecimals(
                  calculateGrossWeight(upperControlLimit),
                ),
          upperOperator: getLimitOperator(
            productionSpecification.upper_control_limit_operator,
            "<=",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit !== null || upperAllowedLimit !== null
      ? `Khối lượng cho phép ${containerLabel} ${formatVariableRange({
          lowerValue:
            lowerAllowedLimit === null
              ? ""
              : formatGramValueTwoDecimals(
                  calculateGrossWeight(lowerAllowedLimit),
                ),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_allowed_limit_operator,
            ">",
          ),
          upperValue:
            upperAllowedLimit === null
              ? ""
              : formatGramValueTwoDecimals(
                  calculateGrossWeight(upperAllowedLimit),
                ),
          upperOperator: getLimitOperator(
            productionSpecification.upper_allowed_limit_operator,
            "<=",
          ),
        })}`
      : "";

  if (!controlRange && !allowedRange) {
    return "";
  }

  return [
    "Tần suất kiểm tra: 30 phút/lần",
    `Khối lượng bao bì trung bình (10 bao bì): ${formatGramValueTwoDecimals(latestShellWeightAverageGram)}`,
    controlRange,
    allowedRange,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildSemiFinishedCapsuleGrossWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  shellWeightAverageMilligram: number | null | undefined,
) => {
  if (!productionSpecification || shellWeightAverageMilligram == null) {
    return "";
  }

  const lowerControlLimit = convertWeightToGram(
    productionSpecification.lower_control_limit,
    productionSpecification.unit,
    "mg",
  );
  const upperControlLimit = convertWeightToGram(
    productionSpecification.upper_control_limit,
    productionSpecification.unit,
    "mg",
  );
  const lowerAllowedLimit = convertWeightToGram(
    productionSpecification.lower_allowed_limit,
    productionSpecification.unit,
    "mg",
  );
  const upperAllowedLimit = convertWeightToGram(
    productionSpecification.upper_allowed_limit,
    productionSpecification.unit,
    "mg",
  );

  const toMilligram = (valueInGram: number) => valueInGram * 1000;
  const checkFrequencyLine = "Tần suất kiểm tra: 30 phút/ lần";
  const shellAverageLine = `Khối lượng vỏ nang trung bình (10 vỏ nang/10): ${formatMilligramValue(
    shellWeightAverageMilligram,
  )}`;
  const controlRange =
    lowerControlLimit !== null || upperControlLimit !== null
      ? `Khối lượng kiểm soát cả vỏ ${formatVariableRange({
          lowerValue:
            lowerControlLimit === null
              ? ""
              : formatMilligramValue(
                  toMilligram(lowerControlLimit) +
                    shellWeightAverageMilligram,
                ),
          lowerOperator: productionSpecification.lower_control_limit_operator,
          upperValue:
            upperControlLimit === null
              ? ""
              : formatMilligramValue(
                  toMilligram(upperControlLimit) +
                    shellWeightAverageMilligram,
                ),
          upperOperator: productionSpecification.upper_control_limit_operator,
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit !== null || upperAllowedLimit !== null
      ? `Khối lượng cho phép cả vỏ ${formatVariableRange({
          lowerValue:
            lowerAllowedLimit === null
              ? ""
              : formatMilligramValue(
                  toMilligram(lowerAllowedLimit) +
                    shellWeightAverageMilligram,
                ),
          lowerOperator: productionSpecification.lower_allowed_limit_operator,
          upperValue:
            upperAllowedLimit === null
              ? ""
              : formatMilligramValue(
                  toMilligram(upperAllowedLimit) +
                    shellWeightAverageMilligram,
                ),
          upperOperator: productionSpecification.upper_allowed_limit_operator,
        })}`
      : "";

  if (!controlRange && !allowedRange) {
    return "";
  }

  return [checkFrequencyLine, shellAverageLine, controlRange, allowedRange]
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
  OPTIONAL_SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  SEMI_FINISHED_GROSS_WEIGHT_KEYS,
  buildSemiFinishedCapsuleGrossWeightRequirement,
  buildSemiFinishedGrossWeightRequirement,
  buildSemiFinishedSolutionPackageGrossWeightRequirement,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatWeight,
  getLatestShellWeightAverageGram,
  getLatestCompleteShellWeightAverageGram,
  getLatestDensityValue,
  getTenShellWeightAverageMilligram,
  getUserLabel,
  hasProductionSpecificationLimits,
  normalizeDecimalText,
  toNumber,
  type ProductionSpecificationLimits,
};
