import { isCancelledProductionOrder } from "../../lib/production-order-status";
import { getProductionOrderReportDay } from "./report-date";
import { buildTimeSummary } from "./time-summary";

export type FinishedProductLot = {
  id: string | number;
  status?: string | null;
  start_date?: string | null;
  date_manufacture?: string | null;
  creation_date?: string | null;
  created_at?: string | null;
  planned_quatity?: string | number | null;
  planned_quantity?: string | number | null;
};

export type FinishedProductOutputSummary = {
  production_order_id?: string | number | null;
  productionOrder?: { id?: string | number | null } | null;
  production_order?: { id?: string | number | null } | null;
  total_quantity?: string | number | null;
  package_count?: string | number | null;
  boxes_per_package?: string | number | null;
  loose_box_count?: string | number | null;
};

const toQuantity = (value: unknown) => {
  const quantity = Number(value ?? 0);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
};

export const buildFinishedProductOutput = (
  lots: FinishedProductLot[],
  summaries: FinishedProductOutputSummary[],
  range: { from: string; to: string } | null,
) => {
  const quantities = new Map<string, number>();
  for (const summary of summaries) {
    const orderId = summary.production_order_id ?? summary.productionOrder?.id ?? summary.production_order?.id;
    if (orderId === null || orderId === undefined) continue;
    const quantity = summary.total_quantity !== null && summary.total_quantity !== undefined && summary.total_quantity !== ""
      ? toQuantity(summary.total_quantity)
      : toQuantity(summary.package_count) * toQuantity(summary.boxes_per_package) + toQuantity(summary.loose_box_count);
    const key = String(orderId);
    quantities.set(key, (quantities.get(key) ?? 0) + quantity);
  }

  const days: string[] = [];
  const output: number[] = [];
  const plannedOutput: number[] = [];
  let lotCount = 0;
  let summarizedLotCount = 0;
  let undatedLotCount = 0;
  let totalQuantity = 0;
  let totalPlannedQuantity = 0;
  const seenIds = new Set<string>();
  for (const lot of lots) {
    const id = String(lot.id);
    if (seenIds.has(id) || isCancelledProductionOrder(lot.status)) continue;
    seenIds.add(id);
    const day = getProductionOrderReportDay(lot);
    if (range && (!day || day < range.from || day > range.to)) continue;
    lotCount += 1;
    if (quantities.has(id)) summarizedLotCount += 1;
    totalQuantity += quantities.get(id) ?? 0;
    const plannedQuantity = toQuantity(lot.planned_quatity ?? lot.planned_quantity);
    totalPlannedQuantity += plannedQuantity;
    if (day) {
      days.push(day);
      output.push(quantities.get(id) ?? 0);
      plannedOutput.push(plannedQuantity);
    } else {
      undatedLotCount += 1;
    }
  }
  const timeline = buildTimeSummary(days, range, output);
  const plannedTimeline = buildTimeSummary(days, range, plannedOutput);
  return {
    ...timeline,
    points: timeline.points.map((point, index) => ({
      ...point,
      plannedQuantity: plannedTimeline.points[index].count,
      actualQuantity: point.count,
    })),
    lotCount,
    summarizedLotCount,
    pendingLotCount: lotCount - summarizedLotCount,
    undatedLotCount,
    totalQuantity,
    totalPlannedQuantity,
  };
};
