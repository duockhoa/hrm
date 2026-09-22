import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EquipmentIncidentReportsController } from './equipment-incident-reports.controller';
import { EquipmentIncidentReportsService } from './equipment-incident-reports.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentMonitoringRecordsService } from './equipment-monitoring-records.service';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentService } from './equipment.service';

@Module({
  controllers: [EquipmentIncidentReportsController, EquipmentController],
  providers: [
    EquipmentService,
    EquipmentIncidentReportsService,
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
