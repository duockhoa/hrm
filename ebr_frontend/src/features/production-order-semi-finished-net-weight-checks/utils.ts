import type {
  ProductionOrderSemiFinishedNetWeightCheck,
  SemiFinishedNetWeightKey,
} from "./types";

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
  film_coated_tablet_weight_lower_control_limit?: string | number | null;
  film_coated_tablet_weight_upper_control_limit?: string | number | null;
  film_coated_tablet_weight_lower_allowed_limit?: string | number | null;
  film_coated_tablet_weight_upper_allowed_limit?: string | number | null;
  film_coated_tablet_weight_unit?: string | number | null;
} | null | undefined;

type DensityCheckForRequirement = {
  id?: string | number | null;
  created_at?: string | null;
  density?: string | number | null;
};

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

const SEMI_FINISHED_NET_WEIGHT_KEYS = [
  "unit_1_net_weight",
  "unit_2_net_weight",
  "unit_3_net_weight",
  "unit_4_net_weight",
  "unit_5_net_weight",
  "unit_6_net_weight",
  "unit_7_net_weight",
  "unit_8_net_weight",
  "unit_9_net_weight",
  "unit_10_net_weight",
] as const satisfies readonly SemiFinishedNetWeightKey[];

const OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS = [
  "unit_2_net_weight",
  "unit_3_net_weight",
  "unit_4_net_weight",
  "unit_5_net_weight",
  "unit_6_net_weight",
  "unit_7_net_weight",
  "unit_8_net_weight",
  "unit_9_net_weight",
  "unit_10_net_weight",
] as const satisfies readonly Exclude<
  SemiFinishedNetWeightKey,
  "unit_1_net_weight"
>[];

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
] as const;

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

const getLatestDensityValue = (
  densityChecks: DensityCheckForRequirement[] | undefined,
) => {
  if (!densityChecks?.length) {
    return null;
  }

  const latestDensityCheck = [...densityChecks].sort((first, second) => {
    const firstTime = first.created_at ? new Date(first.created_at).getTime() : 0;
    const secondTime = second.created_at
      ? new Date(second.created_at).getTime()
      : 0;

    return secondTime - firstTime || Number(second.id ?? 0) - Number(first.id ?? 0);
  })[0];

  return parseDecimalValue(latestDensityCheck?.density);
};

const getLatestRecord = <T extends { id?: string | number | null; created_at?: string | null }>(
  records: T[] | undefined,
) => {
  if (!records?.length) {
    return null;
  }

  return [...records].sort((first, second) => {
    const firstTime = first.created_at ? new Date(first.created_at).getTime() : 0;
    const secondTime = second.created_at
      ? new Date(second.created_at).getTime()
      : 0;

    return secondTime - firstTime || Number(second.id ?? 0) - Number(first.id ?? 0);
  })[0];
};

const getAverageShellWeight = (
  shellWeightChecks: ShellWeightCheckForRequirement[] | undefined,
) => {
  const latestShellWeightCheck = getLatestRecord(shellWeightChecks);

  if (!latestShellWeightCheck) {
    return null;
  }

  const unit = String(latestShellWeightCheck.unit ?? "g")
    .trim()
    .toLocaleLowerCase("vi-VN");
  const weights = SHELL_WEIGHT_KEYS.map((key) => {
    const value = parseDecimalValue(latestShellWeightCheck[key]);

    if (value === null) {
      return null;
    }

    return unit === "mg" ? value / 1000 : value;
  });

  if (weights.some((weight) => weight === null)) {
    return null;
  }

  return weights.reduce<number>((total, weight) => total + (weight ?? 0), 0) /
    weights.length;
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

const DOSAGE_FORM_STAGE_LABELS: Record<string, string> = {
  tablet: "Viên nén",
  capsule: "Viên nang",
  film_coated_tablet: "Viên nén bao phim",
  granules_in_bag: "Cốm trong gói",
};

const formatDosageFormStage = (value: string | number | null | undefined) => {
  const text = formatText(value);

  return DOSAGE_FORM_STAGE_LABELS[text] ?? text;
};

const formatWeightWithUnit = (
  value: string | number | null | undefined,
  unit: string | null | undefined,
) => {
  const formattedWeight = formatWeight(value);

  if (!formattedWeight) {
    return "";
  }

  return `${formattedWeight} ${unit || "g"}`;
};

const formatSpecificationLimit = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
  operator?: string | number | null,
) => {
  const formattedValue = formatText(value);

  if (!formattedValue) {
    return "";
  }

  return [operator, formattedValue, unit].filter(Boolean).join(" ");
};

const formatSpecificationValue = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
) => {
  const formattedValue = formatText(value);

  if (!formattedValue) {
    return "";
  }

  return [formattedValue, unit].filter(Boolean).join(" ");
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

const buildSemiFinishedNetWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
) => {
  if (!productionSpecification) {
    return "";
  }

  const lowerControlLimit = formatSpecificationValue(
    productionSpecification.lower_control_limit,
    productionSpecification.unit,
  );
  const upperControlLimit = formatSpecificationValue(
    productionSpecification.upper_control_limit,
    productionSpecification.unit,
  );
  const lowerAllowedLimit = formatSpecificationValue(
    productionSpecification.lower_allowed_limit,
    productionSpecification.unit,
  );
  const upperAllowedLimit = formatSpecificationValue(
    productionSpecification.upper_allowed_limit,
    productionSpecification.unit,
  );

  const controlRange =
    lowerControlLimit || upperControlLimit
      ? `Khối lượng kiểm soát viên nén ${formatVariableRange({
          lowerValue: lowerControlLimit,
          lowerOperator: getLimitOperator(
            productionSpecification.lower_control_limit_operator,
            ">=",
          ),
          upperValue: upperControlLimit,
          upperOperator: getLimitOperator(
            productionSpecification.upper_control_limit_operator,
            "<=",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? `Khối lượng cho phép viên nén ${formatVariableRange({
          lowerValue: lowerAllowedLimit,
          lowerOperator: getLimitOperator(
            productionSpecification.lower_allowed_limit_operator,
            ">=",
          ),
          upperValue: upperAllowedLimit,
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

const buildGranulesInBagNetWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
) => {
  if (!productionSpecification) {
    return "";
  }

  const lowerControlLimit = formatSpecificationValue(
    productionSpecification.lower_control_limit,
    productionSpecification.unit,
  );
  const upperControlLimit = formatSpecificationValue(
    productionSpecification.upper_control_limit,
    productionSpecification.unit,
  );
  const lowerAllowedLimit = formatSpecificationValue(
    productionSpecification.lower_allowed_limit,
    productionSpecification.unit,
  );
  const upperAllowedLimit = formatSpecificationValue(
    productionSpecification.upper_allowed_limit,
    productionSpecification.unit,
  );

  const controlRange =
    lowerControlLimit || upperControlLimit
      ? `Khối lượng kiểm soát gói tịnh ${formatVariableRange({
          lowerValue: lowerControlLimit,
          lowerOperator: getLimitOperator(
            productionSpecification.lower_control_limit_operator,
            ">=",
          ),
          upperValue: upperControlLimit,
          upperOperator: getLimitOperator(
            productionSpecification.upper_control_limit_operator,
            "<=",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? `Khối lượng cho phép gói tịnh ${formatVariableRange({
          lowerValue: lowerAllowedLimit,
          lowerOperator: getLimitOperator(
            productionSpecification.lower_allowed_limit_operator,
            ">=",
          ),
          upperValue: upperAllowedLimit,
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

const formatGramValue = (value: number) => `${value.toFixed(2)} g`;

const convertVialSolutionLimitToGram = (
  value: string | number | null | undefined,
  unit: string | number | null | undefined,
  density: number | null,
) => {
  const numberValue = parseDecimalValue(value);

  if (numberValue === null) {
    return null;
  }

  const normalizedUnit = String(unit ?? "").trim().toLocaleLowerCase("vi-VN");

  if (normalizedUnit === "g" || normalizedUnit === "gram") {
    return numberValue;
  }

  if (normalizedUnit === "mg") {
    return numberValue / 1000;
  }

  if (density === null) {
    return null;
  }

  return (normalizedUnit === "l" || normalizedUnit === "liter"
    ? numberValue * 1000
    : numberValue) * density * 0.996;
};

const buildVialMassRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  density: number | null,
  {
    title,
    averageShellWeight = 0,
  }: {
    title: string;
    averageShellWeight?: number | null;
  },
) => {
  if (!productionSpecification || averageShellWeight === null) {
    return "";
  }

  const lowerControlLimit = convertVialSolutionLimitToGram(
    productionSpecification.lower_control_limit,
    productionSpecification.unit,
    density,
  );
  const upperControlLimit = convertVialSolutionLimitToGram(
    productionSpecification.upper_control_limit,
    productionSpecification.unit,
    density,
  );
  const lowerAllowedLimit = convertVialSolutionLimitToGram(
    productionSpecification.lower_allowed_limit,
    productionSpecification.unit,
    density,
  );
  const upperAllowedLimit = convertVialSolutionLimitToGram(
    productionSpecification.upper_allowed_limit,
    productionSpecification.unit,
    density,
  );

  const controlRange =
    lowerControlLimit !== null || upperControlLimit !== null
      ? `Khối lượng kiểm soát ${title} ${formatVariableRange({
          lowerValue:
            lowerControlLimit === null
              ? ""
              : formatGramValue(lowerControlLimit + averageShellWeight),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_control_limit_operator,
            ">",
          ),
          upperValue:
            upperControlLimit === null
              ? ""
              : formatGramValue(upperControlLimit + averageShellWeight),
          upperOperator: getLimitOperator(
            productionSpecification.upper_control_limit_operator,
            "<=",
          ),
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit !== null || upperAllowedLimit !== null
      ? `Khối lượng cho phép ${title} ${formatVariableRange({
          lowerValue:
            lowerAllowedLimit === null
              ? ""
              : formatGramValue(lowerAllowedLimit + averageShellWeight),
          lowerOperator: getLimitOperator(
            productionSpecification.lower_allowed_limit_operator,
            ">",
          ),
          upperValue:
            upperAllowedLimit === null
              ? ""
              : formatGramValue(upperAllowedLimit + averageShellWeight),
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
    averageShellWeight
      ? `Khối lượng bao bì trung bình (10 bao bì): ${formatGramValue(averageShellWeight)}`
      : "",
    controlRange,
    allowedRange,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildVialWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  density: number | null,
  averageShellWeight: number | null,
) =>
  buildVialMassRequirement(productionSpecification, density, {
    title: "lọ",
    averageShellWeight,
  });

const buildVialSolutionMassRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  density: number | null,
) =>
  buildVialMassRequirement(productionSpecification, density, {
    title: "dịch trong lọ",
  });

const buildTubeSolutionMassRequirement = (
  productionSpecification: ProductionSpecificationLimits,
  density: number | null,
) =>
  buildVialMassRequirement(productionSpecification, density, {
    title: "dịch trong tuýp",
  });

const getVialCheckType = (
  check: Pick<ProductionOrderSemiFinishedNetWeightCheck, "dosage_form_stage">,
) => {
  const stage = String(check.dosage_form_stage ?? "")
    .trim()
    .toLocaleLowerCase("vi-VN");

  if (stage === "lọ") {
    return "vial";
  }

  if (stage === "lọ dịch") {
    return "solution";
  }

  if (stage === "tuýp" || stage === "tuyp") {
    return "tube";
  }

  return null;
};

const isVialWeightCheck = (
  check: Pick<ProductionOrderSemiFinishedNetWeightCheck, "dosage_form_stage">,
) => getVialCheckType(check) === "vial";

const hasFilmCoatedTabletWeightSpecificationLimits = (
  productionSpecification: ProductionSpecificationLimits,
) =>
  Boolean(
    productionSpecification &&
      [
        productionSpecification.film_coated_tablet_weight_lower_control_limit,
        productionSpecification.film_coated_tablet_weight_upper_control_limit,
        productionSpecification.film_coated_tablet_weight_lower_allowed_limit,
        productionSpecification.film_coated_tablet_weight_upper_allowed_limit,
      ].some(
        (value) => value !== null && value !== undefined && value !== "",
      ),
  );

const buildFilmCoatedTabletWeightRequirement = (
  productionSpecification: ProductionSpecificationLimits,
) => {
  if (!productionSpecification) {
    return "";
  }

  const unit = "mg";
  const lowerControlLimit = formatSpecificationLimit(
    productionSpecification.film_coated_tablet_weight_lower_control_limit,
    unit,
  );
  const upperControlLimit = formatSpecificationLimit(
    productionSpecification.film_coated_tablet_weight_upper_control_limit,
    unit,
  );
  const lowerAllowedLimit = formatSpecificationLimit(
    productionSpecification.film_coated_tablet_weight_lower_allowed_limit,
    unit,
  );
  const upperAllowedLimit = formatSpecificationLimit(
    productionSpecification.film_coated_tablet_weight_upper_allowed_limit,
    unit,
  );

  const controlRange =
    lowerControlLimit || upperControlLimit
      ? `Khối lượng viên nén bao phim kiểm soát ${formatVariableRange({
          lowerValue: lowerControlLimit,
          lowerOperator: ">=",
          upperValue: upperControlLimit,
          upperOperator: "<=",
        })}`
      : "";
  const allowedRange =
    lowerAllowedLimit || upperAllowedLimit
      ? `Khối lượng viên nén bao phim cho phép ${formatVariableRange({
          lowerValue: lowerAllowedLimit,
          lowerOperator: ">=",
          upperValue: upperAllowedLimit,
          upperOperator: "<=",
        })}`
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
  OPTIONAL_SEMI_FINISHED_NET_WEIGHT_KEYS,
  SEMI_FINISHED_NET_WEIGHT_KEYS,
  buildFilmCoatedTabletWeightRequirement,
  buildGranulesInBagNetWeightRequirement,
  buildSemiFinishedNetWeightRequirement,
  buildTubeSolutionMassRequirement,
  buildVialSolutionMassRequirement,
  buildVialWeightRequirement,
  formatDateTime,
  formatDosageFormStage,
  formatText,
  formatWeight,
  formatWeightWithUnit,
  getUserLabel,
  getLatestDensityValue,
  getAverageShellWeight,
  getVialCheckType,
  hasFilmCoatedTabletWeightSpecificationLimits,
  hasProductionSpecificationLimits,
  isVialWeightCheck,
  normalizeDecimalText,
  toNumber,
  type ProductionSpecificationLimits,
};
