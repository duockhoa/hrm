import { isCancelledProductionOrder } from "../../lib/production-order-status";
import { getReportDay } from "./report-date";
import { buildTimeSummary } from "./time-summary";
import type { FinishedProductOutputSummary } from "./finished-product-output";

export type ReportProductionOrder = {
  id: string | number;
  production_order_code?: string | null;
  item_code?: string | null;
  item?: {
    item_name?: string | null;
    name?: string | null;
    item_code?: string | null;
    unit?: string | null;
    productionSpecification?: {
      product_line_id?: string | number | null;
      product_line?: string | null;
      productLine?: {
        id?: string | number | null;
        code?: string | null;
        name?: string | null;
      } | null;
      deleted_at?: string | null;
    } | null;
  } | null;
  description?: string | null;
  status?: string | null;
  type?: string | null;
  lot_no?: string | null;
  unit?: string | null;
  warehouse?: string | null;
  planned_quatity?: string | number | null;
  planned_quantity?: string | number | null;
  date_manufacture?: string | null;
  creation_date?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  expire_date?: string | null;
  packing_specification?: string | null;
  remarks?: string | null;
};

export type ProductionSummary = FinishedProductOutputSummary & {
  id?: string | number;
  created_at?: string | null;
  note?: string | null;
  createdBy?: { name?: string | null; username?: string | null } | null;
};

export const PRODUCTION_STATES = [
  { key: "planned", label: "Đã lên kế hoạch", color: "#f59e0b" },
  { key: "released", label: "Đã phát hành", color: "#3b82f6" },
  { key: "closed", label: "Đã đóng", color: "#10b981" },
  { key: "cancelled", label: "Đã hủy", color: "#f43f5e" },
  { key: "other", label: "Trạng thái khác", color: "#94a3b8" },
] as const;
export type ProductionState = (typeof PRODUCTION_STATES)[number]["key"];
export type ProductionRange = { from: string; to: string } | null;
export type ProductionFilters = {
  product: string;
  productLine: string;
  category: string;
  status: string;
  warehouse: string;
  search: string;
  includeCancelled: boolean;
};
export const EMPTY_PRODUCTION_FILTERS: ProductionFilters = {
  product: "all",
  productLine: "all",
  category: "all",
  status: "all",
  warehouse: "all",
  search: "",
  includeCancelled: false,
};

const text = (value: unknown) => String(value ?? "").trim();
const searchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export const productionQuantity = (value: unknown): number | null => {
  const input = text(value).replace(",", ".");
  if (!input) return null;
  const quantity = Number(input);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
};

export function productionState(value: unknown): ProductionState {
  if (isCancelledProductionOrder(text(value))) return "cancelled";
  const key = searchText(text(value));
  if (["p", "planned", "boposplanned", "boppplanned", "da len ke hoach"].includes(key)) return "planned";
  if (["r", "released", "boposreleased", "boppreleased", "da phat hanh"].includes(key)) return "released";
  if (["l", "closed", "boposclosed", "boppclosed", "da dong"].includes(key)) return "closed";
  return "other";
}

export function productionUnit(value: unknown) {
  const unit = text(value).toLowerCase();
  return ["hộp", "hop", "box", "boxes"].includes(unit) ? "hộp" : unit;
}

export function summaryQuantity(summary: ProductionSummary): number | null {
  if (text(summary.total_quantity)) return productionQuantity(summary.total_quantity);
  const packages = productionQuantity(summary.package_count);
  const boxes = productionQuantity(summary.boxes_per_package);
  const loose = productionQuantity(summary.loose_box_count);
  return packages === null || boxes === null || loose === null ? null : packages * boxes + loose;
}

function productionProductLine(source: ReportProductionOrder) {
  const specification = source.item?.productionSpecification;
  if (!specification || specification.deleted_at) {
    return { productLineKey: "unknown", productLine: "Chưa ghi nhận dòng sản phẩm" };
  }
  const line = specification.productLine;
  const id = text(line?.id ?? specification.product_line_id);
  const code = text(line?.code);
  const name = text(line?.name) || text(specification.product_line);
  return {
    productLineKey: id ? `id:${id}` : code ? `code:${code}` : name ? `name:${name}` : "unknown",
    productLine:
      code && name ? `${code} - ${name}` : name || code || (id ? `Dòng sản phẩm #${id}` : "Chưa ghi nhận dòng sản phẩm"),
  };
}

export function buildProductionRows(
  orders: ReportProductionOrder[],
  summaries: ProductionSummary[],
  range: ProductionRange,
) {
  const byOrder = new Map<string, ProductionSummary[]>();
  const seenSummaries = new Set<string>();
  summaries.forEach((summary) => {
    if (summary.id != null) {
      const id = String(summary.id);
      if (seenSummaries.has(id)) return;
      seenSummaries.add(id);
    }
    const orderId = summary.production_order_id ?? summary.productionOrder?.id ?? summary.production_order?.id;
    if (orderId == null) return;
    const key = String(orderId);
    byOrder.set(key, [...(byOrder.get(key) ?? []), summary]);
  });
  const seenOrders = new Set<string>();
  return orders.flatMap((source) => {
    const id = String(source.id);
    if (seenOrders.has(id)) return [];
    seenOrders.add(id);
    const day =
      getReportDay(source.date_manufacture) ?? getReportDay(source.creation_date) ?? getReportDay(source.created_at);
    if (range && (!day || day < range.from || day > range.to)) return [];
    const itemCode = text(source.item_code) || text(source.item?.item_code);
    const productName = text(source.item?.item_name) || text(source.description) || itemCode || "Chưa rõ sản phẩm";
    const productKey = itemCode ? `code:${itemCode}` : `name:${productName}`;
    const category = itemCode ? (itemCode.toUpperCase().startsWith("TP") ? "finished" : "semi") : "unknown";
    const records = category === "finished" ? (byOrder.get(id) ?? []) : [];
    const validQuantities = records.map(summaryQuantity).filter((value): value is number => value !== null);
    const actual = validQuantities.length ? validQuantities.reduce((sum, value) => sum + value, 0) : null;
    const planned = productionQuantity(source.planned_quatity ?? source.planned_quantity);
    const unit = productionUnit(source.unit) || productionUnit(source.item?.unit);
    const status = productionState(source.status);
    const comparable = category === "finished" && unit === "hộp" && planned !== null && planned > 0 && actual !== null;
    return [
      {
        source,
        id,
        itemCode,
        productKey,
        product: itemCode && productName !== itemCode ? `${productName} (${itemCode})` : productName,
        ...productionProductLine(source),
        category,
        status,
        statusLabel:
          status === "other"
            ? text(source.status) || "Chưa ghi nhận"
            : PRODUCTION_STATES.find((state) => state.key === status)!.label,
        day,
        dateFallback: getReportDay(source.date_manufacture) === null,
        lot: text(source.lot_no) || "Chưa ghi nhận",
        warehouse: text(source.warehouse) || "Chưa ghi nhận kho",
        planned,
        unit,
        actual,
        summaries: records,
        invalidSummaryCount: records.length - validQuantities.length,
        achievement: comparable ? (actual! / planned!) * 100 : null,
        difference: comparable ? actual! - planned! : null,
      },
    ];
  });
}

export type ProductionRow = ReturnType<typeof buildProductionRows>[number];

export function filterProductionRows(rows: ProductionRow[], filters: ProductionFilters) {
  const query = searchText(filters.search.trim());
  return rows.filter(
    (row) =>
      (filters.includeCancelled || filters.status === "cancelled" || row.status !== "cancelled") &&
      (filters.product === "all" || row.productKey === filters.product) &&
      (filters.productLine === "all" || row.productLineKey === filters.productLine) &&
      (filters.category === "all" || row.category === filters.category) &&
      (filters.status === "all" || row.status === filters.status) &&
      (filters.warehouse === "all" || row.warehouse === filters.warehouse) &&
      (!query ||
        searchText(
          [
            row.id,
            row.source.production_order_code,
            row.itemCode,
            row.product,
            row.productLine,
            row.lot,
            row.warehouse,
            row.source.remarks,
          ].join(" "),
        ).includes(query)),
  );
}

export function buildProductionReport(rows: ProductionRow[], range: ProductionRange, selectedUnit: string) {
  const active = rows.filter((row) => row.status !== "cancelled");
  const dated = rows.filter((row): row is ProductionRow & { day: string } => row.day !== null);
  const days = dated.map((row) => row.day).sort();
  const commonRange = range ?? (days.length ? { from: days[0], to: days[days.length - 1] } : null);
  const time = buildTimeSummary(days, commonRange);
  const series = (subset: ProductionRow[], quantity: (row: ProductionRow) => number = () => 1) => {
    const withDays = subset.filter((row): row is ProductionRow & { day: string } => row.day !== null);
    return buildTimeSummary(
      withDays.map((row) => row.day),
      commonRange,
      withDays.map(quantity),
    ).points;
  };
  const statusSeries = PRODUCTION_STATES.map((state) => series(rows.filter((row) => row.status === state.key)));
  const finished = active.filter((row) => row.category === "finished");
  const boxPlans = finished.filter((row) => row.unit === "hộp" && row.planned !== null);
  const comparable = finished.filter((row) => row.achievement !== null);
  // Actual output is always in boxes. The comparable cohort shares known box plans.
  const boxActual = finished.filter((row) => row.unit === "hộp" && row.planned !== null && row.actual !== null);
  const plannedSeries = series(boxPlans, (row) => row.planned ?? 0);
  const actualSeries = series(boxActual, (row) => row.actual ?? 0);
  const allActualSeries = series(finished, (row) => row.actual ?? 0);
  const categorySeries = ["finished", "semi", "unknown"].map((category) =>
    series(rows.filter((row) => row.category === category)),
  );
  let cumulativeOrders = 0;
  let cumulativePlanned = 0;
  let cumulativeActual = 0;
  const timeline = time.points.map((point, index) => {
    cumulativeOrders += point.count;
    cumulativePlanned += plannedSeries[index]?.count ?? 0;
    cumulativeActual += actualSeries[index]?.count ?? 0;
    return {
      ...point,
      cumulativeOrders,
      planned: plannedSeries[index]?.count ?? 0,
      actual: actualSeries[index]?.count ?? 0,
      allActual: allActualSeries[index]?.count ?? 0,
      cumulativePlanned,
      cumulativeActual,
      finished: categorySeries[0][index]?.count ?? 0,
      semi: categorySeries[1][index]?.count ?? 0,
      unknown: categorySeries[2][index]?.count ?? 0,
      statusPlanned: statusSeries[0][index]?.count ?? 0,
      statusReleased: statusSeries[1][index]?.count ?? 0,
      statusClosed: statusSeries[2][index]?.count ?? 0,
      statusCancelled: statusSeries[3][index]?.count ?? 0,
      statusOther: statusSeries[4][index]?.count ?? 0,
    };
  });
  const productGroups = new Map<
    string,
    {
      key: string;
      name: string;
      count: number;
      planned: number;
      actual: number;
      closed: number;
      plannedCount: number;
      summarizedCount: number;
    }
  >();
  rows.forEach((row) => {
    const product = productGroups.get(row.productKey) ?? {
      key: row.productKey,
      name: row.product,
      count: 0,
      planned: 0,
      actual: 0,
      closed: 0,
      plannedCount: 0,
      summarizedCount: 0,
    };
    product.count += 1;
    if (row.status === "closed") product.closed += 1;
    if (row.status !== "cancelled") {
      if (row.unit === selectedUnit && row.planned !== null) {
        product.planned += row.planned;
        product.plannedCount += 1;
      }
      if (row.category === "finished" && row.actual !== null) {
        product.actual += row.actual;
        product.summarizedCount += 1;
      }
    }
    productGroups.set(row.productKey, product);
  });
  const lineGroups = new Map<string, ProductionRow[]>();
  rows.forEach((row) => {
    const group = lineGroups.get(row.productLineKey);
    if (group) group.push(row);
    else lineGroups.set(row.productLineKey, [row]);
  });
  const productLines = Array.from(lineGroups, ([key, group]) => {
    const active = group.filter((row) => row.status !== "cancelled");
    const planned = active.filter((row) => row.unit === selectedUnit && row.planned !== null);
    const summarized = active.filter((row) => row.category === "finished" && row.actual !== null);
    const comparable = active.filter((row) => row.achievement !== null);
    const comparablePlanned = comparable.reduce((sum, row) => sum + (row.planned ?? 0), 0);
    const comparableActual = comparable.reduce((sum, row) => sum + (row.actual ?? 0), 0);
    return {
      key,
      name: group[0].productLine,
      count: group.length,
      productCount: new Set(group.map((row) => row.productKey)).size,
      activeCount: active.length,
      open: active.filter((row) => row.status === "planned" || row.status === "released").length,
      closed: active.filter((row) => row.status === "closed").length,
      cancelled: group.length - active.length,
      plannedOrders: active.filter((row) => row.status === "planned").length,
      releasedOrders: active.filter((row) => row.status === "released").length,
      otherOrders: active.filter((row) => row.status === "other").length,
      planned: planned.reduce((sum, row) => sum + (row.planned ?? 0), 0),
      plannedCount: planned.length,
      actual: summarized.reduce((sum, row) => sum + (row.actual ?? 0), 0),
      summarizedCount: summarized.length,
      comparablePlanned,
      comparableActual,
      comparableCount: comparable.length,
      outputAchievement: comparablePlanned > 0 ? (comparableActual / comparablePlanned) * 100 : null,
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  const warehouses = new Map<string, number>();
  rows.forEach((row) => warehouses.set(row.warehouse, (warehouses.get(row.warehouse) ?? 0) + 1));
  const achievement = [
    { name: "Dưới 80%", min: 0, max: 80 },
    { name: "80–<95%", min: 80, max: 95 },
    { name: "95–<100%", min: 95, max: 100 },
    { name: "Đạt 100%", min: 100, max: 100 },
    { name: "Trên 100%", min: 100, max: Infinity },
  ].map((bucket, index) => ({
    name: bucket.name,
    count: comparable.filter((row) =>
      index === 3
        ? row.achievement === 100
        : index === 4
          ? row.achievement! > 100
          : row.achievement! >= bucket.min && row.achievement! < bucket.max,
    ).length,
  }));
  const heatmap = time.points.map((point) => ({ ...point, weekdays: Array<number>(7).fill(0) }));
  dated.forEach((row) => {
    const point = heatmap.findLast((period) => row.day >= period.key);
    if (point) point.weekdays[(new Date(`${row.day}T00:00:00Z`).getUTCDay() + 6) % 7] += 1;
  });
  const comparablePlanned = comparable.reduce((sum, row) => sum + (row.planned ?? 0), 0);
  const comparableActual = comparable.reduce((sum, row) => sum + (row.actual ?? 0), 0);
  return {
    total: rows.length,
    activeCount: active.length,
    productCount: productGroups.size,
    productLines,
    productLineCount: productLines.filter((line) => line.key !== "unknown").length,
    missingProductLineCount: rows.filter((row) => row.productLineKey === "unknown").length,
    closedCount: active.filter((row) => row.status === "closed").length,
    openCount: active.filter((row) => row.status === "planned" || row.status === "released").length,
    cancelledCount: rows.length - active.length,
    plannedQuantity: active
      .filter((row) => row.unit === selectedUnit)
      .reduce((sum, row) => sum + (row.planned ?? 0), 0),
    plannedOrderCount: active.filter((row) => row.unit === selectedUnit && row.planned !== null).length,
    actualQuantity: finished.reduce((sum, row) => sum + (row.actual ?? 0), 0),
    outputAchievement: comparablePlanned > 0 ? (comparableActual / comparablePlanned) * 100 : null,
    comparableCount: comparable.length,
    comparablePlanned,
    comparableActual,
    pendingSummaryCount: finished.filter((row) => row.summaries.length === 0).length,
    finishedCount: finished.length,
    semiCount: active.filter((row) => row.category === "semi").length,
    summarizedCount: finished.filter((row) => row.actual !== null).length,
    undatedCount: rows.filter((row) => row.day === null).length,
    dateFallbackCount: rows.filter((row) => row.dateFallback && row.day !== null).length,
    missingPlanCount: active.filter((row) => row.planned === null).length,
    missingUnitCount: active.filter((row) => !row.unit).length,
    invalidSummaryCount: active.reduce((sum, row) => sum + row.invalidSummaryCount, 0),
    incomparableCount: finished.filter((row) => row.actual !== null && row.achievement === null).length,
    boxPlanCount: boxPlans.length,
    boxActualCount: boxActual.length,
    timeline,
    resolutionLabel: time.resolutionLabel,
    products: Array.from(productGroups.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"),
    ),
    states: PRODUCTION_STATES.map((state) => ({
      ...state,
      count: rows.filter((row) => row.status === state.key).length,
    })),
    warehouses: Array.from(warehouses, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    achievement,
    heatmap,
    scatter: comparable.map((row) => ({
      planned: row.planned!,
      actual: row.actual!,
      lot: row.lot,
      product: row.product,
      id: row.id,
      achievement: row.achievement!,
    })),
  };
}
