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
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { FeaturesModule } from '../features/features.module';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { ProductionOrderFriabilityChecksService } from './production-order-friability-checks.service';
import { ProductionOrderSprayDoseChecksService } from './production-order-spray-dose-checks.service';
import { ProductionOrderPostHomogenizationGranuleChecksService } from './production-order-post-homogenization-granule-checks.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { ProductionOrderHardCapsuleLeakageChecksService } from './production-order-hard-capsule-leakage-checks.service';
import { ProductionOrderBottleVolumeChecksService } from './production-order-bottle-volume-checks.service';
import { ProductionOrderShellWeightChecksService } from './production-order-shell-weight-checks.service';
import { ProductionOrderTenShellWeightChecksService } from './production-order-ten-shell-weight-checks.service';
import { ProductionOrderVialInspectionChecksService } from './production-order-vial-inspection-checks.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';
import { ProductionOrderCylinderCalibrationsService } from './production-order-cylinder-calibrations.service';
import { ProductionOrderSensoryChecksService } from './production-order-sensory-checks.service';
import { ProductionOrderSteamSterilizationChecksService } from './production-order-steam-sterilization-checks.service';
import { ProductionOrderSemiFinishedGrossWeightChecksService } from './production-order-semi-finished-gross-weight-checks.service';

@Module({
  imports: [FeaturesModule],
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    ProductionOrderSamplingRequestsService,
    ProductionOrderSamplingRecordsService,
    ProductionOrderDisinfectantPreparationsService,
    ProductionOrderEnvironmentChecksService,
    ProductionOrderFinishedProductSummariesService,
    ProductionOrderDensityChecksService,
    ProductionOrderFriabilityChecksService,
    ProductionOrderSprayDoseChecksService,
    ProductionOrderPostHomogenizationGranuleChecksService,
    ProductionOrderDisintegrationChecksService,
    ProductionOrderHardCapsuleLeakageChecksService,
    ProductionOrderBottleVolumeChecksService,
    ProductionOrderShellWeightChecksService,
    ProductionOrderTenShellWeightChecksService,
    ProductionOrderVialInspectionChecksService,
    ProductionOrderCylinderCalibrationsService,
    ProductionOrderSensoryChecksService,
    ProductionOrderDateChecksService,
    ProductionOrderSteamSterilizationChecksService,
    ProductionOrderSemiFinishedGrossWeightChecksService,
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
