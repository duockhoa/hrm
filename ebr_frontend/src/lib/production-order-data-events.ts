export const PRODUCTION_ORDER_DATA_CHANGED =
  "ebr:production-order-data-changed";

export const notifyProductionOrderDataChanged = (url: string) => {
  if (typeof window === "undefined") return;
  if (
    /^\/(production-orders|production-order-deviations|features)(\/|$)/.test(
      url,
    ) ||
    url.startsWith("/sap-b1-connector/production-orders/")
  ) {
    window.dispatchEvent(
      new CustomEvent(PRODUCTION_ORDER_DATA_CHANGED, { detail: { url } }),
    );
  }
};
