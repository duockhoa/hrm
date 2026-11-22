import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { WarehouseTemperatureHumidityHistoryController } from './warehouse-temperature-humidity-history.controller';
import { PrismaService } from 'src/prisma.service';
import { WarehouseTemperatureHumidityChecksController } from './warehouse-temperature-humidity-checks.controller';
import { WarehouseTemperatureHumidityChecksService } from './warehouse-temperature-humidity-checks.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [
    WarehouseTemperatureHumidityChecksController,
    WarehouseTemperatureHumidityHistoryController,
  ],
  providers: [WarehouseTemperatureHumidityChecksService, PrismaService],
})
export class WarehouseTemperatureHumidityChecksModule {}
