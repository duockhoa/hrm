import {
  buildSemiFinishedNetWeightChecksHtml,
  type SemiFinishedNetWeightCheckForReport,
} from './semi-finished-net-weight-checks-report-html';
import {
  buildSemiFinishedGrossWeightChecksHtml,
  type SemiFinishedGrossWeightCheckForReport,
} from './semi-finished-gross-weight-checks-report-html';
import {
  buildVolumeChecksHtml,
  type VolumeCheckForReport,
} from './volume-checks-report-html';
import {
  buildHygieneChecksHtml,
  type HygieneCheckForReport,
} from './hygiene-checks-report-html';
import {
  buildLeakTightnessChecksHtml,
  type LeakTightnessCheckForReport,
} from './leak-tightness-checks-report-html';
import {
  buildEnvironmentChecksHtml,
  type EnvironmentCheckForReport,
} from './environment-checks-report-html';
import {
  buildSemiFinishedProductSummariesHtml,
  type SemiFinishedProductSummaryForReport,
} from './semi-finished-product-summaries-report-html';
import {
  buildShellWeightChecksHtml,
  type ShellWeightCheckForReport,
} from './shell-weight-checks-report-html';
import {
  buildDisinfectantPreparationsHtml,
  type DisinfectantPreparationForReport,
} from './disinfectant-preparations-report-html';
import {
  buildPostHomogenizationGranuleChecksHtml,
  type PostHomogenizationGranuleCheckForReport,
} from './post-homogenization-granule-checks-report-html';
import {
  buildSensoryChecksHtml,
  type SensoryCheckForReport,
} from './sensory-checks-report-html';
import {
  buildSecondaryPackagingChecksHtml,
  type buildSecondaryPackagingChecksHtmlRecord,
} from './secondary-packaging-checks-report-html';
import {
  buildPreSecondaryPackagingChecksHtml,
  type buildPreSecondaryPackagingChecksHtmlRecord,
} from './pre-secondary-packaging-checks-report-html';
import {
  buildPostPreparationSolutionChecksHtml,
  type buildPostPreparationSolutionChecksHtmlRecord,
} from './post-preparation-solution-checks-report-html';
import {
  buildFriabilityChecksHtml,
  type buildFriabilityChecksHtmlRecord,
} from './friability-checks-report-html';
import {
  buildCylinderCalibrationHtml,
  type buildCylinderCalibrationHtmlRecord,
} from './cylinder-calibration-report-html';
import {
  buildTenShellWeightCheckHtml,
  type buildTenShellWeightCheckHtmlRecord,
} from './ten-shell-weight-check-report-html';
import {
  buildDateChecksHtml,
  type buildDateChecksHtmlRecord,
} from './date-checks-report-html';
import {
  buildProductionOrderAttachmentsHtml,
  type buildProductionOrderAttachmentsHtmlRecord,
} from './production-order-attachments-report-html';
import {
  buildFinishedProductSummaryHtml,
  type buildFinishedProductSummaryHtmlRecord,
} from './finished-product-summary-report-html';
import {
  buildMaterialProcessSummariesHtml,
  type buildMaterialProcessSummariesHtmlRecord,
} from './material-process-summaries-report-html';
import {
  buildFactoryReleaseReviewsHtml,
  type buildFactoryReleaseReviewsHtmlRecord,
} from './factory-release-reviews-report-html';
import {
  buildPrimaryPackagingConfirmationsHtml,
  type buildPrimaryPackagingConfirmationsHtmlRecord,
} from './primary-packaging-confirmations-report-html';
import {
  buildMaterialSummariesHtml,
  type buildMaterialSummariesHtmlRecord,
} from './material-summaries-report-html';
import { Injectable } from '@nestjs/common';
import {
  buildMixingRecordsHtml,
  type MixingRecordForReport,
} from './mixing-records-report-html';
import type {
  Items,
  ProductionOrders,
  RegistrationNumbers,
  ProductionOrderDeviations,
  ProductionOrderVialInspectionChecks,
  ProductionOrderHardCapsuleLeakageChecks,
  ProductionOrderDisintegrationChecks,
  ProductionOrderSprayDoseChecks,
  ProductionOrderTabletThicknessChecks,
  ProductionOrderLineClearanceChecks,
  ProductionOrderHardnessChecks,
  ProductionOrderDensityChecks,
  ProductionOrderSensoryChecks,
  ProductionOrderSamplingRecords,
  Users,
} from '@prisma/client';
import Docxtemplater from 'docxtemplater';
import fs from 'node:fs/promises';
import path from 'node:path';
import PizZip from 'pizzip';
import { ProductionOrderPdfRendererService } from './production-order-pdf-renderer.service';
import { renderProductionOrderReportHtml } from './production-order-report-html';
import type { ProductionOrderLineWithRelations } from '../production-orders.service';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const PRODUCTION_ORDER_TEMPLATE_DIR = path.join(
  process.cwd(),
  'templates',
  'production-order-template',
);

const FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH = path.join(
  PRODUCTION_ORDER_TEMPLATE_DIR,
  'production-order-finished-product-form-template.docx',
);

const SEMI_FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH = path.join(
  PRODUCTION_ORDER_TEMPLATE_DIR,
  'production-order-semi-finished-product-form-template.docx',
);

type ProductionOrderForExport = ProductionOrders & {
  mixingRecords?: MixingRecordForReport[];
  secondaryPackagingChecks?: buildSecondaryPackagingChecksHtmlRecord[];
  preSecondaryPackagingChecks?: buildPreSecondaryPackagingChecksHtmlRecord[];
  postPreparationSolutionChecks?: buildPostPreparationSolutionChecksHtmlRecord[];
  friabilityChecks?: buildFriabilityChecksHtmlRecord[];
  cylinderCalibration?: buildCylinderCalibrationHtmlRecord | null;
  tenShellWeightCheck?: buildTenShellWeightCheckHtmlRecord | null;
  dateChecks?: buildDateChecksHtmlRecord[];
  attachments?: buildProductionOrderAttachmentsHtmlRecord[];
  finishedProductSummaries?: buildFinishedProductSummaryHtmlRecord[];
  materialProcessSummaries?: buildMaterialProcessSummariesHtmlRecord[];
  factoryReleaseReviews?: buildFactoryReleaseReviewsHtmlRecord[];
  primaryPackagingConfirmations?: buildPrimaryPackagingConfirmationsHtmlRecord[];
  materialSummaries?: buildMaterialSummariesHtmlRecord[];
  environmentChecks?: EnvironmentCheckForReport[];
  hygieneChecks?: HygieneCheckForReport[];
  volumeChecks?: VolumeCheckForReport[];
  semiFinishedProductNetWeightChecks?: SemiFinishedNetWeightCheckForReport[];
  semiFinishedProductGrossWeightChecks?: SemiFinishedGrossWeightCheckForReport[];
  leakTightnessChecks?: LeakTightnessCheckForReport[];
  semiFinishedProductSummaries?: SemiFinishedProductSummaryForReport[];
  shellWeightChecks?: ShellWeightCheckForReport[];
  disinfectantPreparations?: DisinfectantPreparationForReport[];
  postHomogenizationGranuleChecks?: PostHomogenizationGranuleCheckForReport[];
  tenUnitSensoryChecks?: SensoryCheckForReport[];
  item?:
    | (Items & {
        registration?: RegistrationNumbers | null;
      })
    | null;
  deviations?: (ProductionOrderDeviations & {
    reporter?: Users | null;
    approver?: Users | null;
  })[];
  vialInspectionChecks?: (ProductionOrderVialInspectionChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  hardCapsuleLeakageChecks?: (ProductionOrderHardCapsuleLeakageChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  disintegrationChecks?: (ProductionOrderDisintegrationChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  sprayDoseChecks?: (ProductionOrderSprayDoseChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  tabletThicknessChecks?: (ProductionOrderTabletThicknessChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  lineClearanceChecks?: (ProductionOrderLineClearanceChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
    previousProductionOrder?: Pick<
      ProductionOrders,
      'description' | 'lot_no'
    > | null;
  })[];
  hardnessChecks?: (ProductionOrderHardnessChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  densityChecks?: (ProductionOrderDensityChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  samplingRecords?: (ProductionOrderSamplingRecords & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  sensoryChecks?: (ProductionOrderSensoryChecks & {
    createdBy?: Pick<Users, 'name' | 'username'> | null;
  })[];
  documentControl?: any;
  pyclm?: any;
  featureConfig?: {
    actions?: { key: string; enabled?: boolean }[];
    sections?: { key: string; enabled?: boolean }[];
    features?: { key: string; enabled?: boolean }[];
  } | null;
};

const REPORT_SECTION_FEATURE_KEYS = {
  secondary_packaging_checks_html: 'secondary_packaging_checks',
  pre_secondary_packaging_checks_html: 'pre_secondary_packaging_checks',
  post_preparation_solution_checks_html: 'post_preparation_solution_checks',
  friability_checks_html: 'friability_checks',
  cylinder_calibration_html: 'cylinder_calibration',
  ten_shell_weight_check_html: 'ten_shell_weight_check',
  date_checks_html: 'date_checks',
  production_order_attachments_html: 'production_order_attachments',
  finished_product_summary_html: 'finished_product_summary',
  material_process_summaries_html: 'material_process_summaries',
  factory_release_reviews_html: 'factory_release_reviews',
  primary_packaging_confirmations_html: 'primary_packaging_confirmations',
  material_summaries_html: 'material_summaries',
  warehouse_release_html: 'production_order_lines',
  deviations_html: 'production_order_deviations',
  taste_checks_html: 'sensory_checks',
  vial_inspection_html: 'vial_inspection_checks',
  hard_capsule_leakage_html: 'hard_capsule_leakage_checks',
  sampling_records_html: 'sampling_records',
  disintegration_checks_html: 'disintegration_checks',
  spray_dose_checks_html: 'spray_dose_checks',
  tablet_thickness_checks_html: 'tablet_thickness_checks',
  line_clearance_checks_html: 'line_clearance_checks',
  hardness_checks_html: 'hardness_checks',
  density_checks_html: 'density_checks',
  environment_checks_html: 'environment_checks',
  hygiene_checks_html: 'hygiene_checks',
  volume_checks_html: 'volume_checks',
  semi_finished_net_weight_checks_html: 'semi_finished_net_weight_checks',
  semi_finished_gross_weight_checks_html: 'semi_finished_gross_weight_checks',
  leak_tightness_checks_html: 'leak_tightness_checks',
  semi_finished_product_summaries_html: 'semi_finished_product_summaries',
  shell_weight_checks_html: 'shell_weight_checks',
  disinfectant_preparations_html: 'disinfectant_preparations',
  post_homogenization_granule_checks_html: 'post_homogenization_granule_checks',
  sensory_checks_html: 'product_sensory_checks',
} as const;

type ReportSectionKey = keyof typeof REPORT_SECTION_FEATURE_KEYS;

const isReportSectionEnabled = (
  productionOrder: ProductionOrderForExport,
  sectionKey: ReportSectionKey,
) => {
  const featureConfig = productionOrder.featureConfig;
  // Preserve compatibility for direct exporter callers that predate feature config.
  if (featureConfig === undefined) return true;

  const hasFeatureConfig = Boolean(
    featureConfig &&
    ((featureConfig.actions?.length ?? 0) > 0 ||
      (featureConfig.sections?.length ?? 0) > 0 ||
      (featureConfig.features?.length ?? 0) > 0),
  );
  const featureKey = REPORT_SECTION_FEATURE_KEYS[sectionKey];

  if (!hasFeatureConfig) return featureKey === 'production_order_lines';

  const configuredSection = featureConfig?.sections?.find(
    (section) => section.key === featureKey,
  );
  return configuredSection
    ? Boolean(configuredSection.enabled)
    : featureKey === 'production_order_lines';
};

const renderFeatureSection = (
  productionOrder: ProductionOrderForExport,
  sectionKey: ReportSectionKey,
  render: () => string,
) => (isReportSectionEnabled(productionOrder, sectionKey) ? render() : '');

const formatDisplayDate = (value: unknown) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const formatDisplayDateTime = (value: unknown) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

const formatProductionOrderStatus = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const statusLabels: Record<string, string> = {
    boposPlanned: 'Đã lên kế hoạch',
    boppPlanned: 'Đã lên kế hoạch',
    Planned: 'Đã lên kế hoạch',
    P: 'Đã lên kế hoạch',
    boposReleased: 'Đã phát hành',
    boppReleased: 'Đã phát hành',
    Released: 'Đã phát hành',
    R: 'Đã phát hành',
    boposClosed: 'Đã đóng',
    boppClosed: 'Đã đóng',
    Closed: 'Đã đóng',
    L: 'Đã đóng',
    boposCancelled: 'Đã hủy',
    boppCancelled: 'Đã hủy',
    Cancelled: 'Đã hủy',
    C: 'Đã hủy',
  };

  const key = String(value);
  return statusLabels[key] ?? key;
};

const formatProductionOrderType = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const typeLabels: Record<string, string> = {
    bopotStandard: 'Tiêu chuẩn',
    Standard: 'Tiêu chuẩn',
    S: 'Tiêu chuẩn',
    bopotSpecial: 'Đặc biệt',
    Special: 'Đặc biệt',
    P: 'Đặc biệt',
    bopotDisassembly: 'Tháo rã',
    Disassembly: 'Tháo rã',
    D: 'Tháo rã',
  };

  const key = String(value);
  return typeLabels[key] ?? key;
};

const getDocControlUserLabel = (user?: any) =>
  user?.name ?? user?.full_name ?? user?.username ?? user?.email ?? '';

const getDocControlStatusText = (
  completedAt?: Date | string | null,
  completedBy?: any,
) => {
  if (!completedAt) {
    return 'Chưa thực hiện';
  }

  const userLabel = getDocControlUserLabel(completedBy);
  return [formatDisplayDateTime(completedAt), userLabel && `- ${userLabel}`]
    .filter(Boolean)
    .join(' ');
};

const normalizeTemplateValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return String(value);
};

const formatDate = (value: Date) => {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = value.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const formatShortDateParts = (day: string, month: string, year: string) => {
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    !Number.isInteger(dayNumber) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(yearNumber) ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  return `${day.padStart(2, '0')}${month.padStart(2, '0')}${year.slice(-2)}`;
};

const formatShortDate = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value).trim();

  if (!normalizedValue) {
    return '';
  }

  if (/^\d{6}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const compactValue = normalizedValue.replace(/\D/g, '');

  if (/^\d{8}$/.test(compactValue)) {
    const parsedDate =
      compactValue.startsWith('19') || compactValue.startsWith('20')
        ? formatShortDateParts(
            compactValue.slice(6, 8),
            compactValue.slice(4, 6),
            compactValue.slice(0, 4),
          )
        : formatShortDateParts(
            compactValue.slice(0, 2),
            compactValue.slice(2, 4),
            compactValue.slice(4, 8),
          );

    if (parsedDate) {
      return parsedDate;
    }
  }

  const date = value instanceof Date ? value : new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  const formattedDate = formatShortDateParts(
    String(date.getUTCDate()),
    String(date.getUTCMonth() + 1),
    String(date.getUTCFullYear()),
  );

  return formattedDate ?? normalizedValue;
};

const formatBatchQuantity = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value).trim();
  const numericValue =
    typeof value === 'number'
      ? value
      : Number(normalizedValue.replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(numericValue)) {
    return normalizedValue;
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 6,
  }).format(numericValue);
};

const getBatchSize = (productionOrder: ProductionOrderForExport) => {
  const quantity = formatBatchQuantity(productionOrder.planned_quatity);
  const unit = normalizeTemplateValue(productionOrder.unit)
    .trim()
    .toLocaleLowerCase('vi-VN');

  return [quantity, unit].filter(Boolean).join(' ');
};

const sanitizeFilenamePart = (value: unknown) => {
  const normalizedValue = normalizeTemplateValue(value);

  return normalizedValue
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getProductionOrderFilename = (
  productionOrder: ProductionOrderForExport,
) => {
  const filenameParts = [
    'Lenh san xuat',
    sanitizeFilenamePart(productionOrder.item?.item_name),
    sanitizeFilenamePart(productionOrder.lot_no),
  ].filter(Boolean);

  if (filenameParts.length === 1) {
    filenameParts.push(String(productionOrder.id));
  }

  return `${filenameParts.join(' ')}.docx`;
};

const isFinishedProductProductionOrder = (
  productionOrder: ProductionOrderForExport,
) => productionOrder.item_code.startsWith('TP');

const getProductionOrderTemplatePath = (
  productionOrder: ProductionOrderForExport,
) =>
  isFinishedProductProductionOrder(productionOrder)
    ? FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH
    : SEMI_FINISHED_PRODUCT_PRODUCTION_ORDER_TEMPLATE_PATH;

const getRegistrationNumber = (productionOrder: ProductionOrderForExport) => {
  const itemReg =
    productionOrder.item?.registration?.registration_number?.trim();
  const poReg =
    (productionOrder as any).registrationNumber?.registration_number?.trim() ||
    (
      productionOrder as any
    ).registrationNumber?.registration?.registration_number?.trim();

  return itemReg || poReg || '';
};

const getProductLine = (productionOrder: ProductionOrderForExport) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;
  const pl = spec?.productLine;
  if (pl) {
    return [pl.code, pl.name].filter(Boolean).join(' - ');
  }
  return spec?.product_line || '';
};

const getDosageForm = (productionOrder: ProductionOrderForExport) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;
  return spec?.dosageForm?.name || spec?.dosage_form || '';
};

const formatLimitWithOp = (
  val: unknown,
  unit?: string | null,
  op?: string | null,
) => {
  if (val === null || val === undefined || val === '') return '';
  const numStr = Number(val);
  const formattedVal = Number.isNaN(numStr)
    ? String(val)
    : numStr.toLocaleString('vi-VN');
  return [op, formattedVal, unit].filter(Boolean).join(' ');
};

const formatLimitRange = (
  lowerVal: unknown,
  lowerOp: string | null | undefined,
  upperVal: unknown,
  upperOp: string | null | undefined,
  unit?: string | null,
) => {
  const lowerStr = formatLimitWithOp(lowerVal, unit, lowerOp);
  const upperStr = formatLimitWithOp(upperVal, unit, upperOp);
  if (lowerStr && upperStr) {
    if (lowerStr === upperStr) return lowerStr;
    return `${lowerStr} – ${upperStr}`;
  }
  return lowerStr || upperStr || '—';
};

const buildSpecificationsTableHtml = (
  productionOrder: ProductionOrderForExport,
) => {
  const spec =
    (productionOrder.item as any)?.productionSpecification ||
    (productionOrder as any)?.productionSpecification;

  if (!spec) {
    return '';
  }

  const rows: { name: string; control: string; allowed: string }[] = [];

  // 1. Thể tích / Khối lượng đóng gói (Giới hạn chung)
  const generalControl = formatLimitRange(
    spec.lower_control_limit,
    spec.lower_control_limit_operator,
    spec.upper_control_limit,
    spec.upper_control_limit_operator,
    spec.unit,
  );
  const generalAllowed = formatLimitRange(
    spec.lower_allowed_limit,
    spec.lower_allowed_limit_operator,
    spec.upper_allowed_limit,
    spec.upper_allowed_limit_operator,
    spec.unit,
  );
  if (generalControl !== '—' || generalAllowed !== '—') {
    rows.push({
      name: 'Giới hạn đóng gói (Thể tích / Khối lượng)',
      control: generalControl,
      allowed: generalAllowed,
    });
  }

  // 2. Số liều xịt
  const sprayControl = formatLimitRange(
    spec.spray_dose_lower_control_limit,
    '>=',
    spec.spray_dose_upper_control_limit,
    '<=',
    'liều',
  );
  const sprayAllowed = formatLimitRange(
    spec.spray_dose_lower_allowed_limit,
    '>=',
    spec.spray_dose_upper_allowed_limit,
    '<=',
    'liều',
  );
  if (sprayControl !== '—' || sprayAllowed !== '—') {
    rows.push({
      name: 'Số liều xịt',
      control: sprayControl,
      allowed: sprayAllowed,
    });
  }

  // 3. Khối lượng viên nén bao phim
  const tabletWeightUnit = spec.film_coated_tablet_weight_unit || 'mg';
  const tabletWeightControl = formatLimitRange(
    spec.film_coated_tablet_weight_lower_control_limit,
    null,
    spec.film_coated_tablet_weight_upper_control_limit,
    null,
    tabletWeightUnit,
  );
  const tabletWeightAllowed = formatLimitRange(
    spec.film_coated_tablet_weight_lower_allowed_limit,
    null,
    spec.film_coated_tablet_weight_upper_allowed_limit,
    null,
    tabletWeightUnit,
  );
  if (tabletWeightControl !== '—' || tabletWeightAllowed !== '—') {
    rows.push({
      name: 'Khối lượng viên nén bao phim',
      control: tabletWeightControl,
      allowed: tabletWeightAllowed,
    });
  }

  // 4. Độ cứng viên
  const hardnessUnit = spec.hardness_unit || 'N';
  const hardnessControl = formatLimitRange(
    spec.hardness_lower_control_limit,
    null,
    spec.hardness_upper_control_limit,
    null,
    hardnessUnit,
  );
  const hardnessAllowed = formatLimitRange(
    spec.hardness_lower_allowed_limit,
    null,
    spec.hardness_upper_allowed_limit,
    null,
    hardnessUnit,
  );
  if (hardnessControl !== '—' || hardnessAllowed !== '—') {
    rows.push({
      name: 'Độ cứng viên',
      control: hardnessControl,
      allowed: hardnessAllowed,
    });
  }

  // 5. Độ dày viên
  const thicknessUnit = spec.tablet_thickness_unit || 'mm';
  const thicknessControl = formatLimitWithOp(
    spec.tablet_thickness_control_limit,
    thicknessUnit,
  );
  const thicknessAllowed = formatLimitWithOp(
    spec.tablet_thickness_allowed_limit,
    thicknessUnit,
  );
  if (thicknessControl || thicknessAllowed) {
    rows.push({
      name: 'Độ dày viên',
      control: thicknessControl || '—',
      allowed: thicknessAllowed || '—',
    });
  }

  // 6. Thời gian rã
  const disintegrationUnit = spec.disintegration_time_unit || 'phút';
  const disintegrationControl = formatLimitWithOp(
    spec.disintegration_time_control_limit,
    disintegrationUnit,
  );
  const disintegrationAllowed = formatLimitWithOp(
    spec.disintegration_time_allowed_limit,
    disintegrationUnit,
  );
  if (disintegrationControl || disintegrationAllowed) {
    rows.push({
      name: 'Thời gian rã',
      control: disintegrationControl || '—',
      allowed: disintegrationAllowed || '—',
    });
  }

  if (rows.length === 0) {
    return '';
  }

  const trs = rows
    .map(
      (r) => `
        <tr>
          <td class="spec-label">${r.name}</td>
          <td class="spec-value">${r.control}</td>
          <td class="spec-value">${r.allowed}</td>
        </tr>`,
    )
    .join('');

  return `
    <div style="margin-top: 4mm;">
      <h3 style="font-size: 11pt; font-weight: bold; margin-bottom: 2mm; text-transform: uppercase; color: #000;">
        Tiêu chuẩn kỹ thuật kiểm soát chất lượng (IPC)
      </h3>
      <table class="batch-spec-table">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Chỉ tiêu kiểm tra</th>
            <th style="width: 30%; text-align: left;">Giới hạn kiểm soát</th>
            <th style="width: 30%; text-align: left;">Giới hạn cho phép</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>
    </div>`;
};

const getTemplateData = (productionOrder: ProductionOrderForExport) => ({
  item_code: normalizeTemplateValue(productionOrder.item_code),
  item_name: normalizeTemplateValue(productionOrder.item?.item_name),
  product_line: normalizeTemplateValue(getProductLine(productionOrder)),
  dosage_form: normalizeTemplateValue(getDosageForm(productionOrder)),
  production_order_code: normalizeTemplateValue(
    productionOrder.production_order_code,
  ),
  lot_no: normalizeTemplateValue(productionOrder.lot_no),
  batch_size: getBatchSize(productionOrder),
  date_manufacture: formatShortDate(productionOrder.date_manufacture),
  expire_date: formatShortDate(productionOrder.expire_date),
  packing_specification: normalizeTemplateValue(
    productionOrder.packing_specification,
  ),
  registration_number: normalizeTemplateValue(
    getRegistrationNumber(productionOrder),
  ),
  remarks: normalizeTemplateValue(productionOrder.remarks),
  status: normalizeTemplateValue(productionOrder.status),
  order_type: normalizeTemplateValue(productionOrder.type),
  planned_quantity: `${Number(productionOrder.planned_quatity || 0).toLocaleString('vi-VN')} ${normalizeTemplateValue(productionOrder.unit)}`,
  warehouse: normalizeTemplateValue(productionOrder.warehouse),
  creation_date: formatShortDate(
    productionOrder.creation_date?.toISOString?.() ?? '',
  ),
  start_date: formatShortDate(
    productionOrder.start_date?.toISOString?.() ?? '',
  ),
  change_content: normalizeTemplateValue(productionOrder.change_content),
});

@Injectable()
export class ProductionOrderExportService {
  constructor(
    private readonly pdfRenderer: ProductionOrderPdfRendererService,
  ) {}

  async exportBatchReport(
    productionOrder: ProductionOrderForExport,
    user?: any,
    lines?: ProductionOrderLineWithRelations[],
  ) {
    const printTime = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
    const printerName = user?.name || user?.full_name || user?.username || '';
    const appInfo = `${process.env.APP_NAME || 'EBR System'} - ${process.env.APP_VERSION || 'v1.0.0'}`;

    // Read watermark for inline embedding in multi-page sections
    const directory = path.join(process.cwd(), 'templates', 'batch-report');
    const [watermarkBuf, logoBuf] = await Promise.all([
      fs.readFile(path.join(directory, 'logo-removebg.png')),
      fs.readFile(path.join(directory, 'logo.png')),
    ]);
    const watermarkDataUri = `data:image/png;base64,${watermarkBuf.toString('base64')}`;
    const esc = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c] ?? c,
      );
    const safeAppInfo = esc(appInfo);
    const safePrintTime = esc(printTime);
    const safePrinterName = esc(printerName);

    const formatNum = (v: unknown) => {
      if (v === null || v === undefined || v === '') return '';
      const n = Number(v);
      if (Number.isNaN(n)) return String(v);
      return n.toLocaleString('vi-VN');
    };
    const formatDate = (v: unknown) => {
      if (!v) return '';
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString('vi-VN');
    };

    const tableHead = `
      <thead>
        <tr>
          <th style="width: 10%;">Giai đoạn</th>
          <th style="width: 11%;">Mã hàng</th>
          <th style="width: 27%;">Tên hàng</th>
          <th style="width: 14%;">Số lô</th>
          <th style="width: 9%;">Hạn dùng</th>
          <th style="width: 8%;">Kho</th>
          <th style="width: 7%; text-align: right;">Yêu cầu</th>
          <th style="width: 7%; text-align: right;">Đã xuất</th>
          <th style="width: 7%;">ĐVT</th>
        </tr>
      </thead>`;

    // The PDF renderer measures this table after fonts are loaded and moves a
    // row to the next page only when it reaches the footer.  Do not split by a
    // fixed row count here: item names, batch numbers and stages can wrap to a
    // different number of lines, leaving a mostly empty final page.
    const buildPageSection = (rowsHtml: string) => `
  <main class="report-page page-break warehouse-release-page">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin phiếu xuất kho
      </h2>
      <table class="deviations-table">${tableHead}<tbody>${rowsHtml}</tbody></table>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;

    let linesHtml = '';

    if (lines && lines.length > 0) {
      const allRows = lines.map((line) => {
        const stage =
          (line.ProductionOrdersStage as any)?.Name ??
          (line.ProductionOrdersStage as any)?.SequenceNumber ??
          '';
        const unit =
          (line.UnitOfMeasurement as any)?.Name ??
          (line.UnitOfMeasurement as any)?.Code ??
          '';
        return `<tr>
          <td>${stage}</td>
          <td style="font-weight: bold;">${(line as any).ItemNo ?? ''}</td>
          <td style="white-space: normal; word-wrap: break-word;">${(line as any).ItemName ?? ''}</td>
          <td style="white-space: normal; word-wrap: break-word;">${(line as any).U_SL ?? ''}</td>
          <td>${formatDate((line as any).U_HSD)}</td>
          <td>${(line as any).Warehouse ?? ''}</td>
          <td style="text-align: right;">${formatNum((line as any).PlannedQuantity)}</td>
          <td style="text-align: right;">${formatNum((line as any).IssuedQuantity)}</td>
          <td>${unit}</td>
        </tr>`;
      });

      linesHtml = buildPageSection(allRows.join(''));
    } else {
      linesHtml = `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 5mm; margin-bottom: 5mm;">
      <h2 style="text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 6mm; text-transform: uppercase; color: #000;">
        Thông tin phiếu xuất kho
      </h2>
      <div style="margin-top: 15mm;">
        <p style="text-align: center; font-style: italic;">(Chưa có dữ liệu)</p>
      </div>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    }

    const buildDeviationsHtml = () => {
      const deviations = (productionOrder as any).deviations ?? [];

      if (!deviations || deviations.length === 0) {
        return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin sai lệch
      </h2>
      <div style="margin-top: 15mm; text-align: center;">
        <p style="font-size: 11pt; font-style: italic; color: #475569;">
          (Không có sai lệch nào phát sinh trong quá trình sản xuất lô này)
        </p>
      </div>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
      }

      const rows = deviations
        .map((dev: any, index: number) => {
          const time = formatDisplayDateTime(dev.created_at);
          const reporterName = esc(
            dev.reporter?.name ?? dev.reporter?.username ?? '',
          );
          const approverName = esc(
            dev.approver?.name ?? dev.approver?.username ?? '',
          );

          let quantityHtml = '';
          if (
            dev.affected_quantity !== null &&
            dev.affected_quantity !== undefined &&
            dev.affected_quantity !== ''
          ) {
            quantityHtml += `<div><span style="color: #64748b;">Ảnh hưởng:</span> <b>${formatNum(dev.affected_quantity)}</b> ${esc(dev.affected_quantity_unit ?? '')}</div>`;
          }
          if (
            dev.handled_quantity !== null &&
            dev.handled_quantity !== undefined &&
            dev.handled_quantity !== ''
          ) {
            quantityHtml += `<div><span style="color: #64748b;">Đã xử lý:</span> <b>${formatNum(dev.handled_quantity)}</b> ${esc(dev.handled_quantity_unit ?? '')}</div>`;
          }
          if (
            dev.destroyed_quantity !== null &&
            dev.destroyed_quantity !== undefined &&
            dev.destroyed_quantity !== ''
          ) {
            quantityHtml += `<div><span style="color: #dc2626;">Đã hủy:</span> <b>${formatNum(dev.destroyed_quantity)}</b> ${esc(dev.destroyed_quantity_unit ?? '')}</div>`;
          }

          const causeClassification = dev.cause_classification
            ? `<div style="font-size: 8pt; color: #64748b; font-style: italic; margin-bottom: 1mm;">[${esc(dev.cause_classification)}]</div>`
            : '';
          const causeContent = dev.cause
            ? esc(dev.cause)
            : dev.cause_classification
              ? ''
              : '—';

          const handlingPlan = dev.handling_plan
            ? `<div><span style="font-weight: bold;">PA:</span> ${esc(dev.handling_plan)}</div>`
            : '';
          const handlingResult = dev.handling_result
            ? `<div style="margin-top: 1mm;"><span style="font-weight: bold;">KQ:</span> ${esc(dev.handling_result)}</div>`
            : '';
          const handlingCombined =
            handlingPlan || handlingResult
              ? `${handlingPlan}${handlingResult}`
              : '—';

          const personnelHtml =
            `<div><span style="color: #64748b;">Báo cáo:</span> ${reporterName || '—'}</div>` +
            (approverName
              ? `<div style="margin-top: 1mm;"><span style="color: #166534;">Duyệt:</span> ${approverName}</div>`
              : `<div style="margin-top: 1mm; color: #94a3b8; font-style: italic;">Chưa duyệt</div>`);

          return `<tr>
          <td style="text-align: center; vertical-align: middle;">${index + 1}</td>
          <td style="text-align: center; vertical-align: middle; font-size: 8.5pt;">${time}</td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            <div style="font-weight: bold; margin-bottom: 1mm;">${esc(dev.deviation_content ?? '')}</div>
            ${quantityHtml ? `<div style="font-size: 8pt; margin-top: 1.5mm; border-top: 0.5pt dashed #cbd5e1; padding-top: 1mm;">${quantityHtml}</div>` : ''}
          </td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            ${causeClassification}
            <div>${causeContent}</div>
          </td>
          <td style="vertical-align: top; white-space: normal; word-wrap: break-word;">
            ${handlingCombined}
          </td>
          <td style="vertical-align: top; font-size: 8.5pt;">
            ${personnelHtml}
          </td>
        </tr>`;
        })
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">
        Thông tin sai lệch
      </h2>
      <table class="deviations-table">
        <thead>
          <tr>
            <th style="width: 5%;">STT</th>
            <th style="width: 12%;">Thời gian</th>
            <th style="width: 28%;">Nội dung sai lệch</th>
            <th style="width: 18%;">Nguyên nhân</th>
            <th style="width: 23%;">Phương án & Kết quả xử lý</th>
            <th style="width: 14%;">Nhân sự</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildTasteChecksHtml = () => {
      const checks = productionOrder.sensoryChecks ?? [];
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            <td>${esc(check.color ?? '')}</td>
            <td>${esc(check.smell ?? '')}</td>
            <td>${esc(check.taste ?? '')}</td>
            <td>${esc(check.note ?? '')}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Thử mùi vị</h2>
      ${
        checks.length
          ? `<table class="deviations-table"><thead><tr>
              <th style="width: 5%;">STT</th><th style="width: 15%;">Thời điểm</th><th style="width: 15%;">Màu sắc</th><th style="width: 15%;">Mùi</th><th style="width: 15%;">Vị</th><th style="width: 20%;">Ghi chú</th><th style="width: 15%;">Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu thử mùi vị)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildVialInspectionHtml = () => {
      const checks = productionOrder.vialInspectionChecks ?? [];
      const total = (key: keyof ProductionOrderVialInspectionChecks) =>
        checks.reduce((sum, check) => sum + Number(check[key] ?? 0), 0);
      const notes = checks
        .map((check) => check.note?.trim())
        .filter(Boolean)
        .join('; ');
      const renderPage = (title: string, content: string) => `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">${title}</h2>
      ${content}
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
      const emptyState =
        '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu)</p></div>';
      const inspectionTable = checks.length
        ? `<table class="deviations-table"><thead><tr>
            <th>Thời điểm</th><th>Bao số</th><th>Lọ có sợi</th><th>Vẩn</th><th>Hỏng</th><th>Lỗi khác</th><th>Ghi chú</th><th>Người nhập</th>
          </tr></thead><tbody>${checks
            .map(
              (check) => `<tr>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td><td style="text-align: right;">${formatNum(check.bag_number)}</td><td style="text-align: right;">${formatNum(check.fiber_vial_count)}</td><td style="text-align: right;">${formatNum(check.particulate_count)}</td><td style="text-align: right;">${formatNum(check.damaged_count)}</td><td style="text-align: right;">${formatNum(check.other_defect_count)}</td><td>${esc(check.note ?? '')}</td><td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
            )
            .join('')}</tbody></table>`
        : emptyState;
      const summaryTable = checks.length
        ? `<table class="deviations-table"><thead><tr>
            <th>Phạm vi</th><th>Bao số</th><th>Lọ có sợi</th><th>Vẩn</th><th>Hỏng</th><th>Lỗi khác</th><th>Ghi chú</th>
          </tr></thead><tbody><tr>
            <td>Toàn lô</td><td style="text-align: right;">${formatNum(total('bag_number'))}</td><td style="text-align: right;">${formatNum(total('fiber_vial_count'))}</td><td style="text-align: right;">${formatNum(total('particulate_count'))}</td><td style="text-align: right;">${formatNum(total('damaged_count'))}</td><td style="text-align: right;">${formatNum(total('other_defect_count'))}</td><td>${esc(notes)}</td>
          </tr></tbody></table>`
        : emptyState;

      return `${renderPage('Soi lọ', inspectionTable)}${renderPage('Tổng kết soi lọ', summaryTable)}`;
    };

    const buildHardCapsuleLeakageHtml = () => {
      const checks = productionOrder.hardCapsuleLeakageChecks ?? [];
      const stageLabels: Record<string, string> = {
        before_coating: 'Trước bao',
        after_coating: 'Sau bao',
      };
      const rows = checks
        .map((check, index) => {
          const testedCount = Number(check.tested_capsule_count) || 0;
          const leakedCount = Number(check.leaked_capsule_count) || 0;
          const leakageRate = testedCount
            ? `${((leakedCount / testedCount) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`
            : '—';

          return `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.checked_at)}</td>
            <td>${esc(stageLabels[check.stage] ?? check.stage)}</td>
            <td style="text-align: right;">${formatNum(testedCount)}</td>
            <td style="text-align: right;">${formatNum(leakedCount)}</td>
            <td style="text-align: right;">${leakageRate}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`;
        })
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra rò rỉ nang cứng</h2>
      ${
        checks.length
          ? `<table class="deviations-table"><thead><tr>
              <th>STT</th><th>Thời điểm</th><th>Công đoạn</th><th>Số viên kiểm tra</th><th>Số viên rò rỉ</th><th>Tỉ lệ rò rỉ</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra rò rỉ nang cứng)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildSamplingRecordsHtml = () => {
      const records = productionOrder.samplingRecords ?? [];
      const rows = records
        .map(
          (record, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(record.created_at)}</td>
            <td>${esc(record.sampling_type)}</td>
            <td style="text-align: right;">${formatNum(record.quantity)}</td>
            <td>${esc(record.unit)}</td>
            <td>${esc(record.createdBy?.name ?? record.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Lấy mẫu</h2>
      ${
        records.length
          ? `<table class="deviations-table"><thead><tr>
              <th>STT</th><th>Thời điểm</th><th>Loại mẫu</th><th>Số lượng</th><th>Đơn vị tính</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu lấy mẫu)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildDisintegrationChecksHtml = () => {
      const checks = productionOrder.disintegrationChecks ?? [];
      const stageLabels: Record<string, string> = {
        tablet: 'Viên nén',
        film_coated_tablet: 'Viên bao phim',
        capsule: 'Viên nang',
      };
      const result = (value: boolean | null | undefined) =>
        value === true ? 'Đạt' : value === false ? 'Không đạt' : '—';
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.checked_at)}</td>
            <td>${esc(stageLabels[check.dosage_form_stage] ?? check.dosage_form_stage)}</td>
            <td style="text-align: center;">${result(check.unit_1_passed)}</td>
            <td style="text-align: center;">${result(check.unit_2_passed)}</td>
            <td style="text-align: center;">${result(check.unit_3_passed)}</td>
            <td style="text-align: center;">${result(check.unit_4_passed)}</td>
            <td style="text-align: center;">${result(check.unit_5_passed)}</td>
            <td style="text-align: center;">${result(check.unit_6_passed)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra độ rã</h2>
      ${
        checks.length
          ? `<table class="deviations-table" style="font-size: 8pt;"><thead><tr>
              <th>STT</th><th>Thời điểm</th><th>Dạng/công đoạn</th><th>Viên 1</th><th>Viên 2</th><th>Viên 3</th><th>Viên 4</th><th>Viên 5</th><th>Viên 6</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra độ rã)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildSprayDoseChecksHtml = () => {
      const checks = productionOrder.sprayDoseChecks ?? [];
      const doseKeys = [
        'bottle_1_spray_dose_count',
        'bottle_2_spray_dose_count',
        'bottle_3_spray_dose_count',
        'bottle_4_spray_dose_count',
        'bottle_5_spray_dose_count',
        'bottle_6_spray_dose_count',
      ] as const;
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            ${doseKeys.map((key) => `<td style="text-align: right;">${check[key] === null ? '—' : formatNum(check[key])}</td>`).join('')}
            <td>${esc(check.unit)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra số lượng liều xịt</h2>
      ${
        checks.length
          ? `<table class="deviations-table" style="font-size: 8pt;"><thead><tr>
              <th>STT</th><th>Thời điểm</th>${doseKeys.map((_, index) => `<th>Lọ ${index + 1} (liều)</th>`).join('')}<th>Đơn vị</th><th>Người kiểm tra</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra số lượng liều xịt)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildTabletThicknessChecksHtml = () => {
      const checks = productionOrder.tabletThicknessChecks ?? [];
      const thicknessKeys = [
        'unit_1_thickness',
        'unit_2_thickness',
        'unit_3_thickness',
        'unit_4_thickness',
        'unit_5_thickness',
        'unit_6_thickness',
        'unit_7_thickness',
        'unit_8_thickness',
        'unit_9_thickness',
        'unit_10_thickness',
      ] as const;
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            ${thicknessKeys.map((key) => `<td style="text-align: right;">${check[key] === null ? '—' : formatNum(check[key])}</td>`).join('')}
            <td>${esc(check.unit)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra độ dày viên</h2>
      ${
        checks.length
          ? `<table class="deviations-table" style="font-size: 7pt;"><thead><tr>
              <th>STT</th><th>Thời điểm</th>${thicknessKeys.map((_, index) => `<th>Viên ${index + 1}</th>`).join('')}<th>Đơn vị</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra độ dày viên)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildLineClearanceChecksHtml = () => {
      const checks = productionOrder.lineClearanceChecks ?? [];
      const rows = checks
        .map((check, index) => {
          const previousOrder = check.previousProductionOrder;
          const previousProduction = [
            previousOrder?.description && esc(previousOrder.description),
            previousOrder?.lot_no && `Lô: ${esc(previousOrder.lot_no)}`,
            !previousOrder && check.previous_lot_no
              ? `Lô: ${esc(check.previous_lot_no)}`
              : '',
          ]
            .filter(Boolean)
            .join('<br />');

          return `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            <td>${esc(check.check_type)}</td>
            <td>${previousProduction || '—'}</td>
            <td>${esc(check.requirement)}</td>
            <td style="text-align: center;">${esc(check.result)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`;
        })
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Dọn quang dây chuyền</h2>
      ${
        checks.length
          ? `<table class="deviations-table"><thead><tr>
              <th>STT</th><th>Thời điểm</th><th>Loại kiểm tra</th><th>Sản phẩm/lô trước</th><th>Yêu cầu</th><th>Kết quả</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu dọn quang dây chuyền)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildHardnessChecksHtml = () => {
      const checks = productionOrder.hardnessChecks ?? [];
      const hardnessKeys = [
        'unit_1_hardness',
        'unit_2_hardness',
        'unit_3_hardness',
        'unit_4_hardness',
        'unit_5_hardness',
        'unit_6_hardness',
        'unit_7_hardness',
        'unit_8_hardness',
        'unit_9_hardness',
        'unit_10_hardness',
      ] as const;
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            ${hardnessKeys.map((key) => `<td style="text-align: right;">${check[key] === null ? '—' : formatNum(check[key])}</td>`).join('')}
            <td>${esc(check.unit)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra độ cứng</h2>
      ${
        checks.length
          ? `<table class="deviations-table" style="font-size: 7pt;"><thead><tr>
              <th>STT</th><th>Thời điểm</th>${hardnessKeys.map((_, index) => `<th>Viên ${index + 1}</th>`).join('')}<th>Đơn vị</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra độ cứng)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const buildDensityChecksHtml = () => {
      const checks = productionOrder.densityChecks ?? [];
      const rows = checks
        .map(
          (check, index) => `<tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: center;">${formatDisplayDateTime(check.created_at)}</td>
            <td style="text-align: right;">${formatNum(check.empty_pycnometer_mass_g)}</td>
            <td style="text-align: right;">${formatNum(check.solution_pycnometer_mass_g)}</td>
            <td style="text-align: right;">${formatNum(check.water_pycnometer_mass_g)}</td>
            <td style="text-align: right;">${formatNum(check.density)}</td>
            <td style="text-align: right;">${check.apparent_density === null ? '—' : formatNum(check.apparent_density)}</td>
            <td>${esc(check.createdBy?.name ?? check.createdBy?.username ?? '')}</td>
          </tr>`,
        )
        .join('');

      return `
  <main class="report-page page-break">
    <img class="watermark" src="${watermarkDataUri}" alt="Watermark" />
    <div class="page-header">
      <span style="flex: 1; text-align: left;">${safeAppInfo}</span>
      <span style="flex: 1; text-align: center;">Báo cáo lô sản xuất</span>
      <span style="flex: 1; text-align: right;">Support 21 CFR 11</span>
    </div>
    <div style="margin-top: 2mm; margin-bottom: 2mm;">
      <h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 3mm; text-transform: uppercase; color: #000;">Kiểm tra tỷ trọng</h2>
      ${
        checks.length
          ? `<table class="deviations-table"><thead><tr>
              <th>STT</th><th>Thời điểm</th><th>Bình rỗng (g)</th><th>Bình chứa dung dịch (g)</th><th>Bình chứa nước (g)</th><th>Tỷ trọng</th><th>Tỷ trọng biểu kiến</th><th>Người nhập</th>
            </tr></thead><tbody>${rows}</tbody></table>`
          : '<div style="margin-top: 15mm; text-align: center;"><p style="font-size: 11pt; font-style: italic; color: #475569;">(Chưa có dữ liệu kiểm tra tỷ trọng)</p></div>'
      }
    </div>
    <div class="page-footer">
      <span style="flex: 1; text-align: left;">${safePrintTime}</span>
      <span style="flex: 1; text-align: center;">${safePrinterName}</span>
    </div>
  </main>`;
    };

    const isPyclmSent = Boolean((productionOrder as any).pyclm?.isSent);
    const pyclmStatusHtml = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${
      isPyclmSent ? '#22c55e' : '#ef4444'
    }; margin-right: 6px; vertical-align: middle;"></span><span>${
      isPyclmSent ? 'Đã gửi' : 'Chưa gửi'
    }</span>`;

    const docControl = (productionOrder as any).documentControl;

    const html = await renderProductionOrderReportHtml(
      {
        ...getTemplateData(productionOrder),
        print_time: printTime,
        printer_name: printerName,
        app_info: appInfo,
        status_label: formatProductionOrderStatus(productionOrder.status),
        type_label: formatProductionOrderType(productionOrder.type),
        planned_quantity_display:
          `${Number(productionOrder.planned_quatity || 0).toLocaleString('vi-VN')} ${normalizeTemplateValue(productionOrder.unit)}`.trim(),
        display_creation_date: formatDisplayDate(productionOrder.creation_date),
        display_start_date: formatDisplayDate(productionOrder.start_date),
        display_date_manufacture: formatDisplayDate(
          productionOrder.date_manufacture,
        ),
        display_expire_date: formatDisplayDate(productionOrder.expire_date),
        pyclm_status_html: pyclmStatusHtml,
        doc_batch_record_issued: getDocControlStatusText(
          docControl?.batch_record_issued_at,
          docControl?.batchRecordIssuedBy,
        ),
        doc_batch_record_received: getDocControlStatusText(
          docControl?.batch_record_received_at,
          docControl?.batchRecordReceivedBy,
        ),
        doc_warehouse_release_received: getDocControlStatusText(
          docControl?.warehouse_release_received_at,
          docControl?.warehouseReleaseReceivedBy,
        ),
        doc_test_certificate_received: getDocControlStatusText(
          docControl?.test_certificate_received_at,
          docControl?.testCertificateReceivedBy,
        ),
        specifications_table_html:
          buildSpecificationsTableHtml(productionOrder),
        secondary_packaging_checks_html: isReportSectionEnabled(
          productionOrder,
          'secondary_packaging_checks_html',
        )
          ? await buildSecondaryPackagingChecksHtml(
              productionOrder.secondaryPackagingChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        pre_secondary_packaging_checks_html: isReportSectionEnabled(
          productionOrder,
          'pre_secondary_packaging_checks_html',
        )
          ? await buildPreSecondaryPackagingChecksHtml(
              productionOrder.preSecondaryPackagingChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        post_preparation_solution_checks_html: isReportSectionEnabled(
          productionOrder,
          'post_preparation_solution_checks_html',
        )
          ? await buildPostPreparationSolutionChecksHtml(
              productionOrder.postPreparationSolutionChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        friability_checks_html: isReportSectionEnabled(
          productionOrder,
          'friability_checks_html',
        )
          ? await buildFriabilityChecksHtml(
              productionOrder.friabilityChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        cylinder_calibration_html: isReportSectionEnabled(
          productionOrder,
          'cylinder_calibration_html',
        )
          ? await buildCylinderCalibrationHtml(
              productionOrder.cylinderCalibration
                ? [productionOrder.cylinderCalibration]
                : [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        ten_shell_weight_check_html: isReportSectionEnabled(
          productionOrder,
          'ten_shell_weight_check_html',
        )
          ? await buildTenShellWeightCheckHtml(
              productionOrder.tenShellWeightCheck
                ? [productionOrder.tenShellWeightCheck]
                : [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        date_checks_html: isReportSectionEnabled(
          productionOrder,
          'date_checks_html',
        )
          ? await buildDateChecksHtml(productionOrder.dateChecks ?? [], {
              appInfo,
              printTime,
              printerName,
              watermarkDataUri,
            })
          : '',
        production_order_attachments_html: isReportSectionEnabled(
          productionOrder,
          'production_order_attachments_html',
        )
          ? await buildProductionOrderAttachmentsHtml(
              productionOrder.attachments ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        finished_product_summary_html: isReportSectionEnabled(
          productionOrder,
          'finished_product_summary_html',
        )
          ? await buildFinishedProductSummaryHtml(
              productionOrder.finishedProductSummaries ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        material_process_summaries_html: isReportSectionEnabled(
          productionOrder,
          'material_process_summaries_html',
        )
          ? await buildMaterialProcessSummariesHtml(
              productionOrder.materialProcessSummaries ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        factory_release_reviews_html: isReportSectionEnabled(
          productionOrder,
          'factory_release_reviews_html',
        )
          ? await buildFactoryReleaseReviewsHtml(
              productionOrder.factoryReleaseReviews ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        primary_packaging_confirmations_html: isReportSectionEnabled(
          productionOrder,
          'primary_packaging_confirmations_html',
        )
          ? await buildPrimaryPackagingConfirmationsHtml(
              productionOrder.primaryPackagingConfirmations ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        material_summaries_html: isReportSectionEnabled(
          productionOrder,
          'material_summaries_html',
        )
          ? await buildMaterialSummariesHtml(
              productionOrder.materialSummaries ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            )
          : '',
        warehouse_release_html: renderFeatureSection(
          productionOrder,
          'warehouse_release_html',
          () => linesHtml,
        ),
        mixing_records_html: productionOrder.featureConfig?.actions?.some(
          (action) => action.key === 'view_mixing_record' && action.enabled,
        )
          ? await buildMixingRecordsHtml(
              productionOrder.mixingRecords ?? [],
              productionOrder,
              {
                appInfo,
                printTime,
                printerName,
                watermarkDataUri,
                logoDataUri: `data:image/png;base64,${logoBuf.toString('base64')}`,
              },
            )
          : '',
        deviations_html: renderFeatureSection(
          productionOrder,
          'deviations_html',
          buildDeviationsHtml,
        ),
        taste_checks_html: renderFeatureSection(
          productionOrder,
          'taste_checks_html',
          buildTasteChecksHtml,
        ),
        vial_inspection_html: renderFeatureSection(
          productionOrder,
          'vial_inspection_html',
          buildVialInspectionHtml,
        ),
        hard_capsule_leakage_html: renderFeatureSection(
          productionOrder,
          'hard_capsule_leakage_html',
          buildHardCapsuleLeakageHtml,
        ),
        sampling_records_html: renderFeatureSection(
          productionOrder,
          'sampling_records_html',
          buildSamplingRecordsHtml,
        ),
        disintegration_checks_html: renderFeatureSection(
          productionOrder,
          'disintegration_checks_html',
          buildDisintegrationChecksHtml,
        ),
        spray_dose_checks_html: renderFeatureSection(
          productionOrder,
          'spray_dose_checks_html',
          buildSprayDoseChecksHtml,
        ),
        tablet_thickness_checks_html: renderFeatureSection(
          productionOrder,
          'tablet_thickness_checks_html',
          buildTabletThicknessChecksHtml,
        ),
        line_clearance_checks_html: renderFeatureSection(
          productionOrder,
          'line_clearance_checks_html',
          buildLineClearanceChecksHtml,
        ),
        hardness_checks_html: renderFeatureSection(
          productionOrder,
          'hardness_checks_html',
          buildHardnessChecksHtml,
        ),
        density_checks_html: renderFeatureSection(
          productionOrder,
          'density_checks_html',
          buildDensityChecksHtml,
        ),
        volume_checks_html: renderFeatureSection(
          productionOrder,
          'volume_checks_html',
          () =>
            buildVolumeChecksHtml(productionOrder.volumeChecks ?? [], {
              appInfo,
              printTime,
              printerName,
              watermarkDataUri,
            }),
        ),
        semi_finished_net_weight_checks_html: renderFeatureSection(
          productionOrder,
          'semi_finished_net_weight_checks_html',
          () =>
            buildSemiFinishedNetWeightChecksHtml(
              productionOrder.semiFinishedProductNetWeightChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        semi_finished_gross_weight_checks_html: renderFeatureSection(
          productionOrder,
          'semi_finished_gross_weight_checks_html',
          () =>
            buildSemiFinishedGrossWeightChecksHtml(
              productionOrder.semiFinishedProductGrossWeightChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        leak_tightness_checks_html: renderFeatureSection(
          productionOrder,
          'leak_tightness_checks_html',
          () =>
            buildLeakTightnessChecksHtml(
              productionOrder.leakTightnessChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        semi_finished_product_summaries_html: renderFeatureSection(
          productionOrder,
          'semi_finished_product_summaries_html',
          () =>
            buildSemiFinishedProductSummariesHtml(
              productionOrder.semiFinishedProductSummaries ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        shell_weight_checks_html: renderFeatureSection(
          productionOrder,
          'shell_weight_checks_html',
          () =>
            buildShellWeightChecksHtml(
              productionOrder.shellWeightChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        disinfectant_preparations_html: renderFeatureSection(
          productionOrder,
          'disinfectant_preparations_html',
          () =>
            buildDisinfectantPreparationsHtml(
              productionOrder.disinfectantPreparations ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        post_homogenization_granule_checks_html: renderFeatureSection(
          productionOrder,
          'post_homogenization_granule_checks_html',
          () =>
            buildPostHomogenizationGranuleChecksHtml(
              productionOrder.postHomogenizationGranuleChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
        sensory_checks_html: renderFeatureSection(
          productionOrder,
          'sensory_checks_html',
          () =>
            buildSensoryChecksHtml(productionOrder.tenUnitSensoryChecks ?? [], {
              appInfo,
              printTime,
              printerName,
              watermarkDataUri,
            }),
        ),
        hygiene_checks_html: renderFeatureSection(
          productionOrder,
          'hygiene_checks_html',
          () =>
            buildHygieneChecksHtml(productionOrder.hygieneChecks ?? [], {
              appInfo,
              printTime,
              printerName,
              watermarkDataUri,
            }),
        ),
        environment_checks_html: renderFeatureSection(
          productionOrder,
          'environment_checks_html',
          () =>
            buildEnvironmentChecksHtml(
              productionOrder.environmentChecks ?? [],
              { appInfo, printTime, printerName, watermarkDataUri },
            ),
        ),
      },
      [
        'secondary_packaging_checks_html',
        'pre_secondary_packaging_checks_html',
        'post_preparation_solution_checks_html',
        'friability_checks_html',
        'cylinder_calibration_html',
        'ten_shell_weight_check_html',
        'date_checks_html',
        'production_order_attachments_html',
        'finished_product_summary_html',
        'material_process_summaries_html',
        'factory_release_reviews_html',
        'primary_packaging_confirmations_html',
        'material_summaries_html',
        'warehouse_release_html',
        'mixing_records_html',
        'deviations_html',
        'taste_checks_html',
        'vial_inspection_html',
        'hard_capsule_leakage_html',
        'sampling_records_html',
        'disintegration_checks_html',
        'spray_dose_checks_html',
        'tablet_thickness_checks_html',
        'line_clearance_checks_html',
        'hardness_checks_html',
        'density_checks_html',
        'environment_checks_html',
        'hygiene_checks_html',
        'volume_checks_html',
        'semi_finished_net_weight_checks_html',
        'semi_finished_gross_weight_checks_html',
        'leak_tightness_checks_html',
        'semi_finished_product_summaries_html',
        'shell_weight_checks_html',
        'disinfectant_preparations_html',
        'post_homogenization_granule_checks_html',
        'sensory_checks_html',
        'pyclm_status_html',
        'specifications_table_html',
      ],
    );
    return {
      buffer: await this.pdfRenderer.render(html),
      contentType: 'application/pdf',
      filename: getProductionOrderFilename(productionOrder)
        .replace(/^Lenh san xuat/, 'Bao cao lo san xuat')
        .replace(/\.docx$/, '.pdf'),
    };
  }

  async export(productionOrder: ProductionOrderForExport) {
    return this.renderTemplate(
      productionOrder,
      getProductionOrderTemplatePath(productionOrder),
    );
  }

  private async renderTemplate(
    productionOrder: ProductionOrderForExport,
    templatePath: string,
  ) {
    const template = await fs.readFile(templatePath);
    const zip = new PizZip(template);
    const doc = new Docxtemplater(zip, {
      delimiters: {
        start: '{{',
        end: '}}',
      },
      linebreaks: true,
      paragraphLoop: true,
    });

    doc.render(getTemplateData(productionOrder));

    return {
      buffer: doc.getZip().generate({
        compression: 'DEFLATE',
        type: 'nodebuffer',
      }) as Buffer,
      contentType: DOCX_MIME_TYPE,
      filename: getProductionOrderFilename(productionOrder),
    };
  }
}
