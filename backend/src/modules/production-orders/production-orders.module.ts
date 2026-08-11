import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersController } from './production-orders.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { ProductionOrderSamplingRecordsService } from './production-order-sampling-records.service';
import { ProductionOrderDisinfectantPreparationsService } from './production-order-disinfectant-preparations.service';
import { ProductionOrderExportService } from './exports/production-order-export.service';
import { WeighingTicketExportService } from './exports/weighing-ticket-export.service';
import { PostWeighingMaterialCheckExportService } from './exports/post-weighing-material-check-export.service';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { ProductionOrderHygieneChecksService } from './production-order-hygiene-checks.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { FeaturesModule } from '../features/features.module';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { ProductionOrderVolumeChecksService } from './production-order-volume-checks.service';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { ProductionOrderSteamSterilizationChecksService } from './production-order-steam-sterilization-checks.service';
import { ProductionOrderFiltrationChecksService } from './production-order-filtration-checks.service';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';
import { ProductionOrderSemiFinishedNetWeightChecksService } from './production-order-semi-finished-net-weight-checks.service';
import { ProductionOrderSemiFinishedProductSummariesService } from './production-order-semi-finished-product-summaries.service';
import { ProductionOrderMaterialSummariesService } from './production-order-material-summaries.service';
import { ProductionOrderMaterialProcessSummariesService } from './production-order-material-process-summaries.service';
import { ProductionOrderLeakTightnessChecksService } from './production-order-leak-tightness-checks.service';
import { ProductionOrderHardnessChecksService } from './production-order-hardness-checks.service';
import { ProductionOrderTabletThicknessChecksService } from './production-order-tablet-thickness-checks.service';
import { ProductionOrderTenUnitSensoryChecksService } from './production-order-ten-unit-sensory-checks.service';
import { ProductionOrderPostPreparationSolutionChecksService } from './production-order-post-preparation-solution-checks.service';
import { ProductionOrderFactoryReleaseReviewsService } from './production-order-factory-release-reviews.service';
import { ProductionOrderDocumentControlsService } from './production-order-document-controls.service';
import { SapB1ConnectorModule } from '../sap-b1-connector/sap-b1-connector.module';

@Module({
  imports: [FeaturesModule, SapB1ConnectorModule],
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    ProductionOrderSamplingRequestsService,
    ProductionOrderSamplingRecordsService,
    ProductionOrderDisinfectantPreparationsService,
    ProductionOrderEnvironmentChecksService,
    ProductionOrderHygieneChecksService,
    ProductionOrderFinishedProductSummariesService,
    ProductionOrderDensityChecksService,
    ProductionOrderFriabilityChecksService,
    ProductionOrderSprayDoseChecksService,
    ProductionOrderPostHomogenizationGranuleChecksService,
    ProductionOrderDisintegrationChecksService,
    ProductionOrderHardCapsuleLeakageChecksService,
    ProductionOrderVolumeChecksService,
    ProductionOrderShellWeightChecksService,
    ProductionOrderTenShellWeightChecksService,
    ProductionOrderVialInspectionChecksService,
    ProductionOrderCylinderCalibrationsService,
    ProductionOrderSensoryChecksService,
    ProductionOrderDateChecksService,
    ProductionOrderSteamSterilizationChecksService,
    ProductionOrderFiltrationChecksService,
    ProductionOrderSemiFinishedGrossWeightChecksService,
    ProductionOrderSemiFinishedNetWeightChecksService,
    ProductionOrderSemiFinishedProductSummariesService,
    ProductionOrderMaterialSummariesService,
    ProductionOrderMaterialProcessSummariesService,
    ProductionOrderLeakTightnessChecksService,
    ProductionOrderHardnessChecksService,
    ProductionOrderTabletThicknessChecksService,
    ProductionOrderTenUnitSensoryChecksService,
    ProductionOrderPostPreparationSolutionChecksService,
    ProductionOrderFactoryReleaseReviewsService,
    ProductionOrderDocumentControlsService,
    WarehouseReleaseExportService,
    WeighingTicketExportService,
    PostWeighingMaterialCheckExportService,
    ProductionOrderExportService,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class ProductionOrdersModule {}
