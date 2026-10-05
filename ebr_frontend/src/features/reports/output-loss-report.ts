import type { PostSecondaryPackagingSummary } from "../production-order-post-secondary-packaging-summaries/types";
import { buildProductionRows, productionQuantity, productionUnit, type ProductionRange, type ProductionSummary, type ReportProductionOrder } from "./production-report";

export type UnitQuantities = Record<string, number>;

export function sumUnitQuantities(groups: UnitQuantities[]): UnitQuantities {
  const totals: UnitQuantities = {};
  groups.forEach((group) => Object.entries(group).forEach(([unit, quantity]) => {
    totals[unit] = (totals[unit] ?? 0) + quantity;
  }));
  return totals;
}

export function buildOutputLossRows(
  orders: ReportProductionOrder[],
  output: ProductionSummary[],
  packaging: PostSecondaryPackagingSummary[],
  range: ProductionRange,
) {
  const byOrder = new Map<string, PostSecondaryPackagingSummary[]>();
  const seen = new Set<string>();
  packaging.forEach((summary) => {
    if (summary.id != null) {
      const key = String(summary.id);
      if (seen.has(key)) return;
      seen.add(key);
    }
    if (summary.production_order_id == null) return;
    const key = String(summary.production_order_id);
    byOrder.set(key, [...(byOrder.get(key) ?? []), summary]);
  });
  return buildProductionRows(orders, output, range)
    .filter((row) => row.category === "finished" && row.status !== "cancelled")
    .map((row) => {
      const records = byOrder.get(row.id) ?? [];
      const pending: UnitQuantities = {};
      const cancellation: UnitQuantities = {};
      records.forEach((summary) => {
        const unit = productionUnit(summary.unit) || "chưa rõ đơn vị";
        (summary.pendingProcessItems ?? summary.pending_process_items ?? []).forEach((item) => {
          const quantity = productionQuantity(item.pending_quantity);
          if (quantity !== null) pending[unit] = (pending[unit] ?? 0) + quantity;
        });
        (summary.pendingCancellationItems ?? summary.pending_cancellation_items ?? []).forEach((item) => {
          const quantity = productionQuantity(item.cancellation_quantity);
          if (quantity !== null) cancellation[unit] = (cancellation[unit] ?? 0) + quantity;
        });
      });
      return { ...row, pending, cancellation, hasPackagingSummary: records.length > 0 };
    })
    .sort((a, b) => (b.day ?? "").localeCompare(a.day ?? "") || a.lot.localeCompare(b.lot, "vi"));
}
