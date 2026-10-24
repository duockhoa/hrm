import { Prisma } from '@prisma/client';

// Each entry addresses the exact relation used by the section, never all
// records from a shared table or a related production order.
export const SECTION_COUNT_RELATIONS = {
  weighing_records: 'weighingRecords',
  production_order_deviations: 'deviations',
  environment_checks: 'environmentChecks',
  line_clearance_checks: 'lineClearanceChecks',
  secondary_packaging_checks: 'secondaryPackagingChecks',
  pre_secondary_packaging_checks: 'preSecondaryPackagingChecks',
  hygiene_checks: 'hygieneChecks',
  density_checks: 'densityChecks',
  post_homogenization_granule_checks: 'postHomogenizationGranuleChecks',
  post_preparation_solution_checks: 'postPreparationSolutionChecks',
  friability_checks: 'friabilityChecks',
  disintegration_checks: 'disintegrationChecks',
  vial_inspection_checks: 'vialInspectionChecks',
  sensory_checks: 'sensoryChecks',
  product_sensory_checks: 'tenUnitSensoryChecks',
  hard_capsule_leakage_checks: 'hardCapsuleLeakageChecks',
  leak_tightness_checks: 'leakTightnessChecks',
  volume_checks: 'volumeChecks',
  shell_weight_checks: 'shellWeightChecks',
  spray_dose_checks: 'sprayDoseChecks',
  hardness_checks: 'hardnessChecks',
  tablet_thickness_checks: 'tabletThicknessChecks',
  semi_finished_gross_weight_checks: 'semiFinishedProductGrossWeightChecks',
  semi_finished_net_weight_checks: 'semiFinishedProductNetWeightChecks',
  date_checks: 'dateChecks',
  finished_product_summary: 'finishedProductSummaries',
  semi_finished_product_summaries: 'semiFinishedProductSummaries',
  material_process_summaries: 'materialProcessSummaries',
  factory_release_reviews: 'factoryReleaseReviews',
  primary_packaging_confirmations: 'primaryPackagingConfirmations',
  sampling_records: 'samplingRecords',
  disinfectant_preparations: 'disinfectantPreparations',
  material_summaries: 'materialSummaries',
  steam_sterilization_checks: 'steamSterilizationChecks',
  post_secondary_packaging_summaries: 'postSecondaryPackagingSummaries',
  filtration_checks: 'filtrationChecks',
} as const satisfies Record<
  string,
  keyof Prisma.ProductionOrdersCountOutputType
>;

export const SECTION_SINGLETON_RELATIONS = {
  cylinder_calibration: 'cylinderCalibration',
  ten_shell_weight_check: 'tenShellWeightCheck',
} as const;

const SECTION_ALIASES: Record<string, string> = {
  cylinder_calibratio: 'cylinder_calibration',
  'vial-inspection-summary': 'vial_inspection_checks',
  vial_inspection_summary: 'vial_inspection_checks',
  vial_inspection_summaries: 'vial_inspection_checks',
};

export const normalizeSectionKey = (key: string) => SECTION_ALIASES[key] ?? key;

export const supportsRequiredSection = (key: string) => {
  const normalizedKey = normalizeSectionKey(key);
  return (
    Object.hasOwn(SECTION_COUNT_RELATIONS, normalizedKey) ||
    Object.hasOwn(SECTION_SINGLETON_RELATIONS, normalizedKey) ||
    [
      'mixing_records',
      'production_order_attachments',
      'production_order_lines',
    ].includes(normalizedKey)
  );
};

export const getSectionPresenceRule = (key: string) => {
  switch (normalizeSectionKey(key)) {
    case 'mixing_records':
      return 'Có ít nhất một phiếu đã nhập kết quả hoặc tải ảnh kết quả.';
    case 'production_order_attachments':
      return 'Có ít nhất một hồ sơ đính kèm có tệp.';
    case 'production_order_lines':
      return 'Có ít nhất một dòng lệnh sản xuất từ SAP.';
    default:
      return 'Có ít nhất một bản ghi đã lưu thuộc lô sản xuất này.';
  }
};
