import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionWorkshopsController } from './production-workshops.controller';
import { ProductionWorkshopsService } from './production-workshops.service';

@Module({
  controllers: [ProductionWorkshopsController],
  providers: [ProductionWorkshopsService, PrismaService],
  exports: [ProductionWorkshopsService],
})
export class ProductionWorkshopsModule {}
