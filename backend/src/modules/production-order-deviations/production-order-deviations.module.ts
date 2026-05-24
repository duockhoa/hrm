import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionOrderDeviationsController } from './production-order-deviations.controller';
import { ProductionOrderDeviationsService } from './production-order-deviations.service';

@Module({
  controllers: [ProductionOrderDeviationsController],
  providers: [ProductionOrderDeviationsService, PrismaService],
})
export class ProductionOrderDeviationsModule {}
