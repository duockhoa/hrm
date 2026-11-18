import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseStocktakesController } from './warehouse-stocktakes.controller';
import { WarehouseStocktakesService } from './warehouse-stocktakes.service';

@Module({
  controllers: [WarehouseStocktakesController],
  providers: [WarehouseStocktakesService, PrismaService],
})
export class WarehouseStocktakesModule {}
