export class CreateProductionOrderPostSecondaryPackagingPendingCancellationItemDto {
  cancellation_quantity!: number | string;
  cancellation_reason!: string;
  cancellation_plan?: string | null;
}
