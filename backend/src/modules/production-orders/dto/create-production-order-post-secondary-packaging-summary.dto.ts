export class CreateProductionOrderPostSecondaryPackagingSummaryDto {
  semi_finished_product_order_id!: number | string;
  received_bag_count!: number | string;
  remaining_quantity!: number | string;
  unit?: string | null;
  remaining_reason?: string | null;
}
