import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersController } from './production-orders.controller';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ProductionOrdersController],
  providers: [
    ProductionOrdersService,
    RolesGuard,
    PermissionsGuard,
    PrismaService,
  ],
})
export class ProductionOrdersModule {}
