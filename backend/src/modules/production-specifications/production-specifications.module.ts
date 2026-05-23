import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductionSpecificationsController } from './production-specifications.controller';
import { ProductionSpecificationsService } from './production-specifications.service';

@Module({
  controllers: [ProductionSpecificationsController],
  providers: [ProductionSpecificationsService, PrismaService],
})
export class ProductionSpecificationsModule {}
