import { Prisma } from '@prisma/client';
import { PRODUCTION_ORDER_PERMISSIONS as PO } from './production-orders.permissions';
import { PRODUCTION_ORDER_DATE_CHECK_PERMISSIONS } from './production-order-date-checks.permissions';
import { PRODUCTION_ORDER_DEVIATION_PERMISSIONS } from '../production-order-deviations/production-order-deviations.permissions';
import { EQUIPMENT_PERMISSIONS } from '../equipment/equipment.permissions';

type HistoryResource = { model: Prisma.ModelName; permission: string };
const resource = (
  model: Prisma.ModelName,
  permission: string = PO.READ,
): HistoryResource => ({ model, permission });

// Only these resources are exposed. Model/table names supplied by clients are never used.
export const PRODUCTION_ORDER_HISTORY_RESOURCES = {
  'production-order': resource('ProductionOrders'),
  'environment-check': resource('ProductionOrderEnvironmentChecks'),
  'hygiene-check': resource('ProductionOrderHygieneChecks'),
  'line-clearance-check': resource('ProductionOrderLineClearanceChecks'),
  'secondary-packaging-check': resource(
    'ProductionOrderSecondaryPackagingChecks',
  ),
  'pre-secondary-packaging-check': resource(
    'ProductionOrderPreSecondaryPackagingChecks',
  ),
  'finished-product-summary': resource(
    'ProductionOrderFinishedProductSummaries',
  ),
  'semi-finished-product-summary': resource(
    'ProductionOrderSemiFinishedProductSummaries',
  ),
  'post-secondary-packaging-summary': resource(
    'ProductionOrderPostSecondaryPackagingSummaries',
    PO.POST_SECONDARY_PACKAGING_SUMMARY_READ,
  ),
  'material-summary': resource(
    'ProductionOrderMaterialSummaries',
    PO.MATERIAL_SUMMARY_READ,
  ),
  'material-process-summary': resource(
    'ProductionOrderMaterialProcessSummaries',
  ),
  'factory-release-review': resource('ProductionOrderFactoryReleaseReviews'),
  'primary-packaging-confirmation': resource(
    'ProductionOrderPrimaryPackagingConfirmations',
  ),
  'density-check': resource('ProductionOrderDensityChecks'),
  'sampling-record': resource('ProductionOrderSamplingRecords'),
  'disinfectant-preparation': resource(
    'ProductionOrderDisinfectantPreparations',
  ),
  'friability-check': resource('ProductionOrderFriabilityChecks'),
  'spray-dose-check': resource('ProductionOrderSprayDoseChecks'),
  'post-homogenization-granule-check': resource(
    'ProductionOrderPostHomogenizationGranuleChecks',
  ),
  'post-preparation-solution-check': resource(
    'ProductionOrderPostPreparationSolutionChecks',
  ),
  'disintegration-check': resource('ProductionOrderDisintegrationChecks'),
  'hard-capsule-leakage-check': resource(
    'ProductionOrderHardCapsuleLeakageChecks',
  ),
  'volume-check': resource('ProductionOrderVolumeChecks'),
  'shell-weight-check': resource('ProductionOrderShellWeightChecks'),
  'ten-shell-weight-check': resource('ProductionOrderTenShellWeightChecks'),
  'semi-finished-gross-weight-check': resource(
    'ProductionOrderSemiFinishedProductGrossWeightChecks',
  ),
  'semi-finished-net-weight-check': resource(
    'ProductionOrderSemiFinishedProductNetWeightChecks',
  ),
  'leak-tightness-check': resource('ProductionOrderLeakTightnessChecks'),
  'hardness-check': resource('ProductionOrderHardnessChecks'),
  'tablet-thickness-check': resource('ProductionOrderTabletThicknessChecks'),
  'vial-inspection-check': resource('ProductionOrderVialInspectionChecks'),
  'sensory-check': resource('ProductionOrderSensoryChecks'),
  'product-sensory-check': resource('ProductionOrderTenUnitSensoryChecks'),
  'steam-sterilization-check': resource(
    'ProductionOrderSteamSterilizationChecks',
    PO.STEAM_STERILIZATION_READ,
  ),
  'filtration-check': resource(
    'ProductionOrderFiltrationChecks',
    PO.FILTRATION_CHECK_READ,
  ),
  'date-check': resource(
    'ProductionOrderDateChecks',
    PRODUCTION_ORDER_DATE_CHECK_PERMISSIONS.READ,
  ),
  'cylinder-calibration': resource('ProductionOrderCylinderCalibrations'),
  'production-order-attachment': resource('ProductionOrderAttachments'),
  'production-order-deviation': resource(
    'ProductionOrderDeviations',
    PRODUCTION_ORDER_DEVIATION_PERMISSIONS.READ,
  ),
  'equipment-monitoring-record': resource(
    'EquipmentMonitoringRecords',
    EQUIPMENT_PERMISSIONS.READ,
  ),
  'weighing-record': resource('ProductionOrderWeighingRecords'),
  'mixing-record': resource('ProductionOrderMixingRecords'),
} satisfies Record<string, HistoryResource>;

export type ProductionOrderHistoryResource =
  keyof typeof PRODUCTION_ORDER_HISTORY_RESOURCES;
