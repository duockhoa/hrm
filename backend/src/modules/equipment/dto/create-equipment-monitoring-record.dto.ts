export class CreateEquipmentMonitoringValueDto {
  parameter_id?: number | string | null;
  value?: string | number | boolean | Date | null;
  note?: string | null;
}

export class CreateEquipmentMonitoringRecordDto {
  production_order_id?: number | string | null;
  equipment_id?: number | string | null;
  recorded_at?: string | Date | null;
  note?: string | null;
  values?: CreateEquipmentMonitoringValueDto[] | null;
}
