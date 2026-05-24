export class UpdateProductionOrderDeviationDto {
  production_order_id?: number | string;
  deviation_content?: string | null;
  deviation_image?: string | null;
  handling_plan?: string | null;
  approver_id?: number | string | null;
  reporter_id?: number | string;
}
