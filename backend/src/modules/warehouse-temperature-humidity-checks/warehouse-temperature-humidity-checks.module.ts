import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { WarehouseTemperatureHumidityChecksController } from './warehouse-temperature-humidity-checks.controller';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

@Module({
  controllers: [WarehouseTemperatureHumidityChecksController],
  providers: [WarehouseTemperatureHumidityChecksService, PrismaService],
})
export class WarehouseTemperatureHumidityChecksModule {}
