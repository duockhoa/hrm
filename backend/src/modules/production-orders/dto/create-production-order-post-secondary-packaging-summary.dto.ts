export class CreateProductionOrderPostSecondaryPackagingSummaryDto {
  semi_finished_product_order_id!: number | string;
  received_bag_count!: number | string;
  remaining_quantity!: number | string;
  remaining_reason?: string | null;
}
