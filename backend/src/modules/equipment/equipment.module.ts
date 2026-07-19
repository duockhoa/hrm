import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentMonitoringRecordsService } from './equipment-monitoring-records.service';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentController],
  providers: [
    EquipmentService,
    EquipmentParametersService,
    EquipmentMonitoringRecordsService,
    PrismaService,
  ],
  exports: [
    EquipmentService,
    EquipmentParametersService,
    EquipmentMonitoringRecordsService,
  ],
})
export class EquipmentModule {}
