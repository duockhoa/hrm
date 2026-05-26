import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersController } from './production-orders.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';
import { WarehouseReleaseExportService } from './exports/warehouse-release-export.service';
import { ProductionOrderSamplingRequestsService } from './production-order-sampling-requests.service';

@Module({
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    ProductionOrderSamplingRequestsService,
    WarehouseReleaseExportService,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class ProductionOrdersModule {}
