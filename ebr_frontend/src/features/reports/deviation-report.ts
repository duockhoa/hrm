import { getReportDay, getProductionOrderReportDay } from "./report-date";
import { buildTimeSummary } from "./time-summary";
import { isCancelledProductionOrder } from "../../lib/production-order-status";
import type { ReportProductionOrder } from "./production-report";

export type DeviationProductionOrder = ReportProductionOrder & { updated_at?: string | null };

type Id = string | number;
type User = { name?: string | null; username?: string | null; email?: string | null };
type Order = {
  id?: Id;
  start_date?: string | null;
  lot_no?: string | null;
  item_code?: string | null;
  description?: string | null;
  item?: { item_name?: string | null; item_code?: string | null } | null;
};

export type ReportDeviation = {
  id?: Id;
  production_order_id?: Id | null;
  productionOrder?: Order | null;
  production_order?: Order | null;
  deviation_content?: string | null;
  cause?: string | null;
  cause_classification?: string | null;
  handling_plan?: string | null;
  handling_result?: string | null;
  affected_quantity?: string | number | null;
  affected_quantity_unit?: string | null;
  handled_quantity?: string | number | null;
  handled_quantity_unit?: string | null;
  destroyed_quantity?: string | number | null;
  destroyed_quantity_unit?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reporter?: User | null;
  approver?: User | null;
  deviation_images?: unknown[] | null;
};

export const DEVIATION_STAGES = [
  { key: "new", label: "Chưa có phương án", color: "#f59e0b" },
  { key: "planned", label: "Có phương án, chưa có kết quả", color: "#3b82f6" },
  { key: "result", label: "Đã ghi nhận kết quả", color: "#10b981" },
] as const;
export type DeviationStage = (typeof DEVIATION_STAGES)[number]["key"];
export type DeviationRow = ReturnType<typeof normalizeDeviation>;
export type DeviationFilters = { product: string; cause: string; stage: string; search: string };
export const EMPTY_DEVIATION_FILTERS: DeviationFilters = { product: "all", cause: "all", stage: "all", search: "" };

export const reportText = (value: unknown) => String(value ?? "").trim();
export const reportUser = (user?: User | null) =>
  reportText(user?.name) || reportText(user?.username) || reportText(user?.email) || "Chưa ghi nhận";

export const deviationQuantity = (value: unknown): number | null => {
  const text = reportText(value).replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export const getDeviationReportDay = (source: ReportDeviation) =>
  getProductionOrderReportDay(source.productionOrder ?? source.production_order);

export function normalizeDeviation(source: ReportDeviation, today: string) {
  const order = source.productionOrder ?? source.production_order;
  const orderId = source.production_order_id ?? order?.id;
  const itemCode = reportText(order?.item_code) || reportText(order?.item?.item_code);
  const productName =
    reportText(order?.item?.item_name) || reportText(order?.description) || itemCode || "Chưa rõ sản phẩm";
  const productKey = itemCode ? `code:${itemCode}` : `name:${productName}`;
  const day = getDeviationReportDay(source);
  const recordDay = getReportDay(source.created_at) ?? getReportDay(source.updated_at);
  const stage: DeviationStage = reportText(source.handling_result)
    ? "result"
    : reportText(source.handling_plan)
      ? "planned"
      : "new";
  const age = recordDay
    ? Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${recordDay}T00:00:00Z`)) / 86400000))
    : null;
  return {
    source,
    orderId: orderId == null ? null : String(orderId),
    productKey,
    product: itemCode && productName !== itemCode ? `${productName} (${itemCode})` : productName,
    lot: reportText(order?.lot_no) || "Chưa ghi nhận",
    day,
    age,
    stage,
    cause: reportText(source.cause_classification) || "Chưa phân loại",
    reporter: reportUser(source.reporter),
    approver: reportUser(source.approver),
  };
}

const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN");

export function filterDeviationRows(rows: DeviationRow[], filters: DeviationFilters) {
  const query = searchable(filters.search.trim());
  return rows.filter(
    (row) =>
      (filters.product === "all" || row.productKey === filters.product) &&
      (filters.cause === "all" || row.cause === filters.cause) &&
      (filters.stage === "all" || row.stage === filters.stage) &&
      (!query ||
        searchable(
          [
            row.source.id,
            row.orderId,
            row.product,
            row.lot,
            row.cause,
            row.reporter,
            row.approver,
            row.source.deviation_content,
            row.source.cause,
            row.source.handling_plan,
            row.source.handling_result,
          ].join(" "),
        ).includes(query)),
  );
}

function countsBy(rows: DeviationRow[], key: (row: DeviationRow) => string) {
  const groups = new Map<string, number>();
  rows.forEach((row) => {
    const label = key(row);
    groups.set(label, (groups.get(label) ?? 0) + 1);
  });
  return Array.from(groups, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"),
  );
}

export function buildDeviationHeatmap(days: string[], range: { from: string; to: string } | null) {
  const sorted = [...days].sort();
  const from = range?.from ?? sorted[0];
  const to = range?.to ?? sorted.at(-1);
  const weeks: { key: string; days: ({ day: string; count: number; level: number } | null)[] }[] = [];
  const months: { key: string; label: string; column: number }[] = [];
  const empty = { weeks, months, from: null, to: null, maxCount: 0, total: 0 };
  if (!from || !to || getReportDay(from) !== from || getReportDay(to) !== to || from > to) return empty;

  const counts = new Map<string, number>();
  days.forEach((day) => {
    if (day >= from && day <= to) counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  const maxCount = Array.from(counts.values()).reduce((max, count) => Math.max(max, count), 0);
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  // Dates are already normalized to Vietnam time; use UTC for calendar arithmetic.
  // GitHub lays out weeks from Sunday to Saturday, with one column per week.
  const cursor = new Date(`${from}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
  const end = new Date(`${to}T00:00:00Z`);
  let previousMonth = "";
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const week: (typeof weeks)[number] = { key, days: [] };
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = cursor.toISOString().slice(0, 10);
      if (day < from || day > to) {
        week.days.push(null);
      } else {
        const month = day.slice(0, 7);
        if (month !== previousMonth) {
          months.push({ key: month, label: `T${cursor.getUTCMonth() + 1}`, column: weeks.length });
          previousMonth = month;
        }
        const count = counts.get(day) ?? 0;
        week.days.push({ day, count, level: count ? Math.ceil((count / maxCount) * 4) : 0 });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, months, from, to, maxCount, total };
}

export function buildDeviationOrderRateReport(
  rows: DeviationRow[],
  orders: DeviationProductionOrder[],
  range: { from: string; to: string } | null,
) {
  const deviationDays = rows.flatMap((row) => row.day ? [row.day] : []);
  const activeOrders = orders.filter((order) => !isCancelledProductionOrder(order.status));
  const datedOrders = activeOrders.flatMap((order) => {
    const day = getProductionOrderReportDay(order);
    const itemCode = reportText(order.item_code) || reportText(order.item?.item_code);
    const productName = reportText(order.item?.item_name) || reportText(order.description) || "Chưa rõ sản phẩm";
    const productKey = itemCode ? `code:${itemCode}` : `name:${productName}`;
    return day ? [{ id: String(order.id), day, productKey }] : [];
  });
  const orderDays = datedOrders.map((order) => order.day);
  // Both series must use the same bounds and resolution, including all-time reports.
  const days = [...deviationDays, ...orderDays].sort();
  const commonRange = range ?? (days.length ? { from: days[0], to: days[days.length - 1] } : null);
  const deviations = buildTimeSummary(deviationDays, commonRange);
  const production = buildTimeSummary(orderDays, commonRange);
  // A production order represents one lot. Count it once in its start period,
  // so the affected lots are always a subset of the denominator's lots.
  const lots = Array.from(new Map(datedOrders.map((order) => [order.id, order])).values());
  const affectedOrderIds = new Set(
    rows.filter((row) => row.orderId !== null && (!range || (row.day !== null && row.day >= range.from && row.day <= range.to)))
      .map((row) => row.orderId),
  );
  const lotSummary = buildTimeSummary(lots.map((lot) => lot.day), commonRange);
  const affectedLotSummary = buildTimeSummary(
    lots.filter((lot) => affectedOrderIds.has(lot.id)).map((lot) => lot.day),
    commonRange,
  );
  const productBuckets = lotSummary.points.map(() => ({
    products: new Set<string>(),
    affectedProducts: new Set<string>(),
  }));
  lots.forEach((lot) => {
    if (!commonRange || lot.day < commonRange.from || lot.day > commonRange.to) return;
    // Bucket keys mark period starts (day, week, month or year).
    const index = lotSummary.points.findLastIndex((point) => point.key <= lot.day);
    const bucket = productBuckets[index];
    if (!bucket) return;
    bucket.products.add(lot.productKey);
    if (affectedOrderIds.has(lot.id)) bucket.affectedProducts.add(lot.productKey);
  });
  return {
    resolutionLabel: deviations.resolutionLabel,
    undatedOrderCount: activeOrders.length - orderDays.length,
    points: deviations.points.map((point, index) => {
      const orderCount = production.points[index]?.count ?? 0;
      const lotCount = lotSummary.points[index]?.count ?? 0;
      const affectedLotCount = affectedLotSummary.points[index]?.count ?? 0;
      const productCount = productBuckets[index]?.products.size ?? 0;
      const affectedProductCount = productBuckets[index]?.affectedProducts.size ?? 0;
      return {
        ...point,
        deviationCount: point.count,
        orderCount,
        rate: orderCount > 0 ? (point.count / orderCount) * 100 : null,
        lotCount,
        affectedLotCount,
        lotRate: lotCount > 0 ? (affectedLotCount / lotCount) * 100 : null,
        productCount,
        affectedProductCount,
        productRate: productCount > 0 ? (affectedProductCount / productCount) * 100 : null,
      };
    }),
  };
}

export function buildDeviationReport(rows: DeviationRow[], range: { from: string; to: string } | null) {
  const dated = rows.filter((row): row is DeviationRow & { day: string } => row.day !== null);
  const time = buildTimeSummary(
    dated.map((row) => row.day),
    range,
  );
  // Reuse the same range for every series, including empty buckets.
  const commonRange =
    range ??
    (dated.length
      ? {
          from: dated.map((row) => row.day).sort()[0],
          to: dated
            .map((row) => row.day)
            .sort()
            .at(-1)!,
        }
      : null);
  const stageSeries = DEVIATION_STAGES.map(({ key }) =>
    buildTimeSummary(
      dated.filter((row) => row.stage === key).map((row) => row.day),
      commonRange,
    ),
  );
  let cumulative = 0;
  const timeline = time.points.map((point, index) => {
    cumulative += point.count;
    return {
      ...point,
      cumulative,
      new: stageSeries[0].points[index]?.count ?? 0,
      planned: stageSeries[1].points[index]?.count ?? 0,
      result: stageSeries[2].points[index]?.count ?? 0,
    };
  });
  let causeCumulative = 0;
  const causes = countsBy(rows, (row) => row.cause).map((point) => {
    causeCumulative += point.count;
    return {
      ...point,
      percentage: rows.length ? (point.count / rows.length) * 100 : 0,
      cumulative: rows.length ? (causeCumulative / rows.length) * 100 : 0,
    };
  });
  const productGroups = new Map<string, { name: string; count: number }>();
  rows.forEach((row) => {
    const group = productGroups.get(row.productKey) ?? { name: row.product, count: 0 };
    group.count += 1;
    productGroups.set(row.productKey, group);
  });
  const products = Array.from(productGroups.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"),
  );
  const quantities = new Map<string, { unit: string; affected: number; handled: number; destroyed: number }>();
  const quantityFields = [
    ["affected_quantity", "affected_quantity_unit", "affected"],
    ["handled_quantity", "handled_quantity_unit", "handled"],
    ["destroyed_quantity", "destroyed_quantity_unit", "destroyed"],
  ] as const;
  rows.forEach(({ source }) =>
    quantityFields.forEach(([field, unitField, key]) => {
      const value = deviationQuantity(source[field]);
      if (value === null) return;
      const unit = reportText(source[unitField]).toLocaleLowerCase("vi-VN");
      if (!unit) return;
      const group = quantities.get(unit) ?? { unit, affected: 0, handled: 0, destroyed: 0 };
      group[key] += value;
      quantities.set(unit, group);
    }),
  );
  const pending = rows.filter((row) => row.stage !== "result");
  const ages = [
    { name: "0–7 ngày", min: 0, max: 7 },
    { name: "8–14 ngày", min: 8, max: 14 },
    { name: "15–30 ngày", min: 15, max: 30 },
    { name: "31–60 ngày", min: 31, max: 60 },
    { name: ">60 ngày", min: 61, max: Infinity },
  ].map((bucket) => ({
    name: bucket.name,
    count: pending.filter((row) => row.age !== null && row.age >= bucket.min && row.age <= bucket.max).length,
  }));
  return {
    total: rows.length,
    affectedOrders: new Set(rows.map((row) => row.orderId).filter((id) => id !== null)).size,
    productCount: productGroups.size,
    unplannedCount: rows.filter((row) => !reportText(row.source.handling_plan)).length,
    pendingCount: pending.length,
    resultCount: rows.length - pending.length,
    resultRate: rows.length ? ((rows.length - pending.length) / rows.length) * 100 : 0,
    missingCause: rows.filter((row) => !reportText(row.source.cause)).length,
    unclassifiedCount: rows.filter((row) => row.cause === "Chưa phân loại").length,
    missingQuantity: rows.filter((row) => deviationQuantity(row.source.affected_quantity) === null).length,
    missingUnitCount: rows.filter(({ source }) =>
      quantityFields.some(
        ([field, unitField]) => deviationQuantity(source[field]) !== null && !reportText(source[unitField]),
      ),
    ).length,
    undatedCount: rows.length - dated.length,
    unknownAgeCount: pending.filter((row) => row.age === null).length,
    oldestPending: pending.reduce((max, row) => Math.max(max, row.age ?? 0), 0),
    timeline,
    resolutionLabel: time.resolutionLabel,
    causes,
    products,
    stages: DEVIATION_STAGES.map((stage) => ({
      ...stage,
      count: rows.filter((row) => row.stage === stage.key).length,
    })),
    quantities: Array.from(quantities.values()).sort((a, b) => a.unit.localeCompare(b.unit, "vi")),
    ages,
    heatmap: buildDeviationHeatmap(dated.map((row) => row.day), commonRange),
  };
}

