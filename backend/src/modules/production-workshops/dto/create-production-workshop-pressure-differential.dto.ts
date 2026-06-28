export class CreateProductionWorkshopPressureDifferentialDto {
  gauge_name?: string | null;
  differential_pressure?: number | string | null;
  conclusion?: string | null;
  checked_at?: string | Date | null;
}
