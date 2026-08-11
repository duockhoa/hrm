export class CreateProductionOrderMaterialProcessSummaryDto {
  process_stage!: string;
  yielded_quantity!: number | string;
  yielded_unit?: string | null;
  moisture_percent?: number | string | null;
  note?: string | null;
}
