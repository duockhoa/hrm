import type { ProductionOrderFeatureConfig } from "./production-order-feature-config";

// Keep visibility checks in each action. This helper only changes position.
// The first configured key wins when a button supports a legacy action key.
export const sortProductionOrderActions = <
  T extends { keys: readonly string[] },
>(
  featureConfig: ProductionOrderFeatureConfig | undefined,
  actions: readonly T[],
): T[] => {
  const orders = new Map(
    (featureConfig?.actions ?? []).map((action) => [
      action.key,
      action.order ?? 0,
    ]),
  );
  const getOrder = (action: T) => {
    const key = action.keys.find((key) => orders.has(key));
    return key === undefined ? Number.POSITIVE_INFINITY : orders.get(key)!;
  };

  // Stable sorting keeps the existing button order for ties and absent config.
  return [...actions].sort((first, second) => {
    const firstOrder = getOrder(first);
    const secondOrder = getOrder(second);
    return firstOrder === secondOrder ? 0 : firstOrder - secondOrder;
  });
};
