export class UpdateProductionOrderEnvironmentCheckDto {
  room?: string | null;
  temperature_c?: number | string | null;
  humidity_percent?: number | string | null;
  checked_at?: string | Date | null;
}
