export class UpdateProductionOrderSemiFinishedProductSummaryDto {
  stage?: string | null;
  input_quantity?: number | string | null;
  input_unit?: string | null;
  load_quantity?: number | string | null;
  load_unit?: string | null;
  packed_quantity?: number | string | null;
  packed_unit?: string | null;
  leftover_quantity?: number | string | null;
  leftover_unit?: string | null;
  waste_quantity?: number | string | null;
  waste_unit?: string | null;
}
