const CANCELLED_PRODUCTION_ORDER_STATUSES = new Set([
  "boposcancelled",
  "boppcancelled",
  "cancelled",
  "c",
  "đã hủy",
  "đã huỷ",
  "hủy",
  "huỷ",
]);

export const isCancelledProductionOrder = (
  status: string | number | null | undefined,
) =>
  CANCELLED_PRODUCTION_ORDER_STATUSES.has(
    String(status ?? "")
      .trim()
      .toLowerCase(),
  );
