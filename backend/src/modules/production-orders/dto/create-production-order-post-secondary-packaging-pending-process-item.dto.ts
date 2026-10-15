export class CreateProductionOrderPostSecondaryPackagingPendingProcessItemDto {
  pending_quantity!: number | string;
  unit?: string | null;
  pending_reason!: string;
  processing_plan?: string | null;
}
