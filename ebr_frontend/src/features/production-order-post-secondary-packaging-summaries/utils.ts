import type {
  PostSecondaryPackagingSummary,
  SummaryProductionOrder,
  SummaryUser,
} from "./types";

const COMMON_UNIT_OPTIONS = [
  "kg",
  "g",
  "hộp",
  "vỉ",
  "lọ",
  "viên",
  "gói",
  "chai",
  "ống",
] as const;

const formatNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("vi-VN", { maximumFractionDigits: 3 })
    : String(value);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatQuantitiesByUnit = <T extends { unit?: string | null }>(
  items: T[],
  getQuantity: (item: T) => string | number | null | undefined,
) => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const quantity = Number(String(getQuantity(item) ?? 0).replace(",", "."));
    if (!Number.isFinite(quantity)) continue;
    const unit = item.unit?.trim() || "chưa rõ đơn vị";
    totals.set(unit, (totals.get(unit) ?? 0) + quantity);
  }
  return (
    Array.from(
      totals,
      ([unit, quantity]) => `${formatNumber(quantity)} ${unit}`,
    ).join("; ") || "0"
  );
};

const getUserLabel = (user: SummaryUser | null | undefined) =>
  user?.name ?? user?.username ?? user?.email ?? "—";

const getSummaryUser = (summary: PostSecondaryPackagingSummary) =>
  summary.createdBy ?? summary.created_by;

const getSummaryOrder = (summary: PostSecondaryPackagingSummary) =>
  summary.semiFinishedProductOrder ?? summary.semi_finished_product_order;

const getOrderLabel = (order: SummaryProductionOrder | null | undefined) => {
  if (!order) return "—";
  const code =
    order.production_order_code ?? order.lot_no ?? order.id ?? "Không rõ mã";
  const itemCode = order.item?.item_code ?? order.item_code;
  const itemName = order.item?.item_name ?? order.description;
  return [code, itemCode, itemName].filter(Boolean).join(" · ");
};

const getPendingProcessItems = (summary: PostSecondaryPackagingSummary) =>
  summary.pendingProcessItems ?? summary.pending_process_items ?? [];

const getPendingCancellationItems = (summary: PostSecondaryPackagingSummary) =>
  summary.pendingCancellationItems ?? summary.pending_cancellation_items ?? [];

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    responseError?.response?.data?.message ?? responseError?.message ?? fallback
  );
};

export {
  COMMON_UNIT_OPTIONS,
  formatDateTime,
  formatNumber,
  formatQuantitiesByUnit,
  getErrorMessage,
  getOrderLabel,
  getPendingCancellationItems,
  getPendingProcessItems,
  getSummaryOrder,
  getSummaryUser,
  getUserLabel,
};
