export class UpdateProductionOrderLineClearanceCheckDto {
  check_type?: string | null;
  requirement?: string | null;
  result?: string | null;
  previous_production_order_id?: number | string | null;
  previous_lot_no?: string | null;
}
