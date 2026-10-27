import type { ProductionOrderCompleteness } from "../production-orders/types";

export const getActionsWithSectionData = (
  completeness: ProductionOrderCompleteness | undefined,
): Set<string> =>
  new Set(
    (completeness?.action_sections ?? [])
      .filter((section) => section.status === "has_data")
      .flatMap((section) => section.action_keys),
  );
