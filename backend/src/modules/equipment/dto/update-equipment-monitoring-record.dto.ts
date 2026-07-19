import { CreateEquipmentMonitoringValueDto } from './create-equipment-monitoring-record.dto';

export class UpdateEquipmentMonitoringRecordDto {
  recorded_at?: string | Date | null;
  note?: string | null;
  values?: CreateEquipmentMonitoringValueDto[] | null;
}
