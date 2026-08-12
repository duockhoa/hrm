import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopCleaningChecklistsService } from './production-workshop-cleaning-checklists.service';
import { ProductionWorkshopPressureDifferentialsService } from './production-workshop-pressure-differentials.service';
import { ProductionWorkshopsController } from './production-workshops.controller';
import { ProductionWorkshopsService } from './production-workshops.service';

@Module({
  controllers: [ProductionWorkshopsController],
  providers: [
    ProductionWorkshopsService,
    ProductionWorkshopCleaningChecklistsService,
    ProductionWorkshopPressureDifferentialsService,
    PrismaService,
  ],
  exports: [
    ProductionWorkshopsService,
    ProductionWorkshopCleaningChecklistsService,
    ProductionWorkshopPressureDifferentialsService,
  ],
})
export class ProductionWorkshopsModule {}
