export class CreateProductionOrderPostSecondaryPackagingPendingCancellationItemDto {
  cancellation_quantity!: number | string;
  unit?: string | null;
  cancellation_reason!: string;
  cancellation_plan?: string | null;
}
