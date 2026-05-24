export class CreateProductionOrderDeviationDto {
  production_order_id!: number | string;
  deviation_content!: string;
  deviation_images?: string | string[] | null;
  deviation_image?: string | null;
  handling_plan!: string;
  approver_id?: number | string | null;
  reporter_id!: number | string;
}
