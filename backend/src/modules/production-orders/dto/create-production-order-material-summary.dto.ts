export class CreateProductionOrderMaterialSummaryDto {
  material_code?: string | null;
  lot_no?: string | null;
  received_quantity?: number | string | null;
  used_quantity?: number | string | null;
  supplier_waste_quantity?: number | string | null;
  production_waste_quantity?: number | string | null;
  remaining_quantity?: number | string | null;
  sample_quantity?: number | string | null;
  summarized_by_id?: number | string | null;
}
