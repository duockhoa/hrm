import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersController } from './production-orders.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';
import { ProductionOrderExportService } from './exports/production-order-export.service';
import { ProductionOrderEnvironmentChecksService } from './production-order-environment-checks.service';
import { ProductionOrderFinishedProductSummariesService } from './production-order-finished-product-summaries.service';
import { FeaturesModule } from '../features/features.module';
import { ProductionOrderDensityChecksService } from './production-order-density-checks.service';
import { ProductionOrderDisintegrationChecksService } from './production-order-disintegration-checks.service';
import { ProductionOrderDateChecksService } from './production-order-date-checks.service';

@Module({
  imports: [FeaturesModule],
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    ProductionOrderSamplingRequestsService,
    ProductionOrderEnvironmentChecksService,
    ProductionOrderFinishedProductSummariesService,
    ProductionOrderDensityChecksService,
    ProductionOrderDisintegrationChecksService,
    ProductionOrderDateChecksService,
    WarehouseReleaseExportService,
    ProductionOrderExportService,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class ProductionOrdersModule {}
