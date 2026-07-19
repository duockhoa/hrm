export class UpdateProductionOrderDeviationDto {
  production_order_id?: number | string;
  deviation_content?: string | null;
  deviation_images?: string | string[] | null;
  deviation_image?: string | null;
  handling_plan?: string | null;
  handling_result?: string | null;
  cause?: string | null;
  cause_classification?: string | null;
  affected_quantity?: number | string | null;
  affected_quantity_unit?: string | null;
  handled_quantity?: number | string | null;
  handled_quantity_unit?: string | null;
  destroyed_quantity?: number | string | null;
  destroyed_quantity_unit?: string | null;
  approver_id?: number | string | null;
  reporter_id?: number | string;
}
