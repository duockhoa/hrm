import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';
import { ProductionWorkshopsController } from './production-workshops.controller';
import { ProductionWorkshopsService } from './production-workshops.service';

@Module({
  controllers: [ProductionWorkshopsController],
  providers: [
    ProductionWorkshopsService,
    ProductionWorkshopPressureDifferentialsService,
    PrismaService,
  ],
  exports: [
    ProductionWorkshopsService,
    ProductionWorkshopPressureDifferentialsService,
  ],
})
export class ProductionWorkshopsModule {}
