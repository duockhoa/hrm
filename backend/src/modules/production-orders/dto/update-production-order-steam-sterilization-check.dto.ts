export class UpdateProductionOrderSteamSterilizationCheckDto {
  equipment_name?: string | null;
  setting_temperature?: number | string | null;
  setting_time?: number | string | null;
  checked_by_id?: number | string | null;
  checked_at?: string | Date | null;
}
