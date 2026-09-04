import type { ComponentType } from "react";
import { EnvironmentCheckDetail } from "@/features/production-order-environment-checks";
import { LineClearanceCheckDetail } from "@/features/production-order-line-clearance-checks";
import { SecondaryPackagingCheckDetail } from "@/features/production-order-secondary-packaging-checks";
import { PreSecondaryPackagingCheckDetail } from "@/features/production-order-pre-secondary-packaging-checks";
import { HygieneCheckDetail } from "@/features/production-order-hygiene-checks";
import { FinishedProductSummaryDetail } from "@/features/finished-product-summary";
import { SemiFinishedProductSummaryDetail } from "@/features/production-order-semi-finished-product-summaries";
import {
  PostSecondaryPackagingSummariesView,
  PostSecondaryPackagingSummaryDetail,
} from "@/features/production-order-post-secondary-packaging-summaries";
import { MaterialProcessSummaryDetail } from "@/features/production-order-material-process-summaries";
import { FactoryReleaseReviewDetail } from "@/features/production-order-factory-release-reviews";
import { PrimaryPackagingConfirmationDetail } from "@/features/production-order-primary-packaging-confirmations";
import { DensityCheckDetail } from "@/features/production-order-density-checks";
import { PostHomogenizationGranuleCheckDetail } from "@/features/production-order-post-homogenization-granule-checks";
import { PostPreparationSolutionCheckDetail } from "@/features/production-order-post-preparation-solution-checks";
import { FriabilityCheckDetail } from "@/features/production-order-friability-checks";
import { DisintegrationCheckDetail } from "@/features/production-order-disintegration-checks";
import {
  VialInspectionCheckDetail,
  VialInspectionSummaryDetail,
} from "@/features/production-order-vial-inspection-checks";
import { SensoryCheckDetail } from "@/features/production-order-sensory-checks";
import { ProductSensoryCheckDetail } from "@/features/production-order-product-sensory-checks";
import { HardCapsuleLeakageCheckDetail } from "@/features/production-order-hard-capsule-leakage-checks";
import { LeakTightnessCheckDetail } from "@/features/production-order-leak-tightness-checks";
import { VolumeCheckDetail } from "@/features/production-order-volume-checks";
import { SprayDoseCheckDetail } from "@/features/production-order-spray-dose-checks";
import { HardnessCheckDetail } from "@/features/production-order-hardness-checks";
import { TabletThicknessCheckDetail } from "@/features/production-order-tablet-thickness-checks";
import { SemiFinishedGrossWeightCheckDetail } from "@/features/production-order-semi-finished-gross-weight-checks";
import { SemiFinishedNetWeightCheckDetail } from "@/features/production-order-semi-finished-net-weight-checks";
import { ShellWeightCheckDetail } from "@/features/production-order-shell-weight-checks";
import { TenShellWeightCheckDetail } from "@/features/production-order-ten-shell-weight-checks";
import { ProductionOrderDeviationDetail } from "@/features/production-order-deviations";
import {
  DateCheckDetail,
  DateChecksView,
} from "@/features/production-order-date-checks";
import { SamplingRecordDetail } from "@/features/production-order-sampling-records";
import { DisinfectantPreparationDetail } from "@/features/production-order-disinfectant-preparations";
import { SteamSterilizationChecksView } from "@/features/production-order-steam-sterilization-checks";
import { SteamSterilizationCheckDetail } from "@/features/production-order-steam-sterilization-checks";
import {
  FiltrationCheckDetail,
  FiltrationChecksView,
} from "@/features/production-order-filtration-checks";
import { CylinderCalibrationDetail } from "@/features/production-order-cylinder-calibrations";
import { FormEquipmentMonitoringRecord } from "@/features/equipment-monitoring-records";
import { ProductionOrderAttachmentDetail } from "@/features/production-order-attachments";
import {
  ProductionOrderLineDetail,
  ProductionOrderLinesDetail,
} from "@/features/production-order-lines";

type DetailComponentProps = {
  id: string | number;
  itemCode?: string | number | null;
  onClose: () => void;
};

const PRODUCTION_ORDER_DETAIL_TYPES = {
  deviation: "production-order-deviation",
  environmentCheck: "environment-check",
  lineClearanceCheck: "line-clearance-check",
  secondaryPackagingCheck: "secondary-packaging-check",
  preSecondaryPackagingCheck: "pre-secondary-packaging-check",
  hygieneCheck: "hygiene-check",
  densityCheck: "density-check",
  postHomogenizationGranuleCheck: "post-homogenization-granule-check",
  postPreparationSolutionCheck: "post-preparation-solution-check",
  friabilityCheck: "friability-check",
  disintegrationCheck: "disintegration-check",
  vialInspectionCheck: "vial-inspection-check",
  vialInspectionSummary: "vial-inspection-summary",
  sensoryCheck: "sensory-check",
  productSensoryCheck: "product-sensory-check",
  hardCapsuleLeakageCheck: "hard-capsule-leakage-check",
  leakTightnessCheck: "leak-tightness-check",
  volumeCheck: "volume-check",
  sprayDoseCheck: "spray-dose-check",
  hardnessCheck: "hardness-check",
  tabletThicknessCheck: "tablet-thickness-check",
  semiFinishedGrossWeightCheck: "semi-finished-gross-weight-check",
  semiFinishedNetWeightCheck: "semi-finished-net-weight-check",
  shellWeightCheck: "shell-weight-check",
  tenShellWeightCheck: "ten-shell-weight-check",
  dateCheck: "date-check",
  dateChecks: "date-checks",
  finishedProductSummary: "finished-product-summary",
  semiFinishedProductSummary: "semi-finished-product-summary",
  postSecondaryPackagingSummary: "post-secondary-packaging-summary",
  postSecondaryPackagingSummaries: "post-secondary-packaging-summaries",
  materialProcessSummary: "material-process-summary",
  factoryReleaseReview: "factory-release-review",
  primaryPackagingConfirmation: "primary-packaging-confirmation",
  samplingRecord: "sampling-record",
  disinfectantPreparation: "disinfectant-preparation",
  steamSterilizationChecks: "steam-sterilization-checks",
  steamSterilizationCheck: "steam-sterilization-check",
  filtrationChecks: "filtration-checks",
  filtrationCheck: "filtration-check",
  cylinderCalibration: "cylinder-calibration",
  productionOrderLines: "production-order-lines",
  productionOrderLine: "production-order-line",
  equipmentMonitoringRecord: "equipment-monitoring-record",
  productionOrderAttachment: "production-order-attachment",
} as const;

type ProductionOrderDetailType =
  (typeof PRODUCTION_ORDER_DETAIL_TYPES)[keyof typeof PRODUCTION_ORDER_DETAIL_TYPES];

type ProductionOrderDetailSelection = {
  type: ProductionOrderDetailType;
  id: string | number;
  itemCode?: string | number | null;
};

const DETAIL_COMPONENTS: Record<
  ProductionOrderDetailType,
  ComponentType<DetailComponentProps>
> = {
  [PRODUCTION_ORDER_DETAIL_TYPES.deviation]: ProductionOrderDeviationDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.environmentCheck]: EnvironmentCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.lineClearanceCheck]: LineClearanceCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.secondaryPackagingCheck]:
    SecondaryPackagingCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.preSecondaryPackagingCheck]:
    PreSecondaryPackagingCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.hygieneCheck]: HygieneCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.densityCheck]: DensityCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.postHomogenizationGranuleCheck]:
    PostHomogenizationGranuleCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.postPreparationSolutionCheck]:
    PostPreparationSolutionCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.friabilityCheck]: FriabilityCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.disintegrationCheck]:
    DisintegrationCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.vialInspectionCheck]:
    VialInspectionCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.vialInspectionSummary]:
    VialInspectionSummaryDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.sensoryCheck]: SensoryCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.productSensoryCheck]:
    ProductSensoryCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.hardCapsuleLeakageCheck]:
    HardCapsuleLeakageCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.leakTightnessCheck]: LeakTightnessCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.volumeCheck]: VolumeCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.sprayDoseCheck]: SprayDoseCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.hardnessCheck]: HardnessCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.tabletThicknessCheck]:
    TabletThicknessCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedGrossWeightCheck]:
    SemiFinishedGrossWeightCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedNetWeightCheck]:
    SemiFinishedNetWeightCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.shellWeightCheck]: ShellWeightCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.tenShellWeightCheck]:
    TenShellWeightCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.dateCheck]: DateCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.dateChecks]: DateChecksView,
  [PRODUCTION_ORDER_DETAIL_TYPES.finishedProductSummary]:
    FinishedProductSummaryDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.semiFinishedProductSummary]:
    SemiFinishedProductSummaryDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.postSecondaryPackagingSummary]:
    PostSecondaryPackagingSummaryDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.postSecondaryPackagingSummaries]:
    PostSecondaryPackagingSummariesView,
  [PRODUCTION_ORDER_DETAIL_TYPES.materialProcessSummary]:
    MaterialProcessSummaryDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.factoryReleaseReview]:
    FactoryReleaseReviewDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.primaryPackagingConfirmation]:
    PrimaryPackagingConfirmationDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.samplingRecord]: SamplingRecordDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.disinfectantPreparation]:
    DisinfectantPreparationDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.steamSterilizationChecks]:
    SteamSterilizationChecksView,
  [PRODUCTION_ORDER_DETAIL_TYPES.steamSterilizationCheck]:
    SteamSterilizationCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.filtrationChecks]: FiltrationChecksView,
  [PRODUCTION_ORDER_DETAIL_TYPES.filtrationCheck]: FiltrationCheckDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.cylinderCalibration]:
    CylinderCalibrationDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.productionOrderLines]:
    ProductionOrderLinesDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.productionOrderLine]:
    ProductionOrderLineDetail,
  [PRODUCTION_ORDER_DETAIL_TYPES.equipmentMonitoringRecord]:
    FormEquipmentMonitoringRecord,
  [PRODUCTION_ORDER_DETAIL_TYPES.productionOrderAttachment]:
    ProductionOrderAttachmentDetail,
};

export {
  DETAIL_COMPONENTS,
  PRODUCTION_ORDER_DETAIL_TYPES,
  type ProductionOrderDetailSelection,
};
