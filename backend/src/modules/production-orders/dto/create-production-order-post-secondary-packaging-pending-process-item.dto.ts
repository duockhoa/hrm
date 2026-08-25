export class CreateProductionOrderPostSecondaryPackagingPendingProcessItemDto {
  pending_quantity!: number | string;
  pending_reason!: string;
  processing_plan?: string | null;
}
