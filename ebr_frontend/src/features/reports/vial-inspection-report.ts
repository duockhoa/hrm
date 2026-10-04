import type { ProductionOrderVialInspectionCheck } from "../production-order-vial-inspection-checks/types";
import { isCancelledProductionOrder } from "../../lib/production-order-status";
import { getProductionOrderReportDay } from "./report-date";
import { buildTimeSummary } from "./time-summary";

export type ReportVialInspection = ProductionOrderVialInspectionCheck & {
  productionOrder?: {
    id?: number | string;
    production_order_code?: string | null;
    item_code?: string | null;
    lot_no?: string | null;
    status?: string | null;
    date_manufacture?: string | null;
    start_date?: string | null;
    planned_quatity?: number | string | null;
    planned_quantity?: number | string | null;
    item?: { item_code?: string | null; item_name?: string | null } | null;
  } | null;
};
export const VIAL_DEFECTS = [
  { key: "fiber_vial_count", label: "Lọ có sợi", color: "#6366f1" },
  { key: "particulate_count", label: "Vẩn", color: "#0ea5e9" },
  { key: "damaged_count", label: "Hỏng", color: "#f43f5e" },
  { key: "other_defect_count", label: "Lỗi khác", color: "#f59e0b" },
] as const;
export type VialDefectKey = (typeof VIAL_DEFECTS)[number]["key"];
export type VialReportRange = { from: string; to: string } | null;
export type VialReportFilters = {
  product: string;
  order: string;
  creator: string;
  defect: string;
  result: string;
  search: string;
  includeCancelled: boolean;
};
export const EMPTY_VIAL_FILTERS: VialReportFilters = {
  product: "all",
  order: "all",
  creator: "all",
  defect: "all",
  result: "all",
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

export const vialCount = (value: unknown): number | null => {
  const input = text(value);
  if (!/^\d+$/.test(input)) return null;
  const count = Number(input);
  return Number.isSafeInteger(count) ? count : null;
};

export function buildVialInspectionRows(checks: ReportVialInspection[], range: VialReportRange) {
  const seen = new Set<string>();
  return checks.flatMap((source, index) => {
    const key = source.id == null ? `row:${index}` : `id:${source.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const day = getProductionOrderReportDay(source.productionOrder);
    if (range && (!day || day < range.from || day > range.to)) return [];
    const order = source.productionOrder;
    const orderId = source.production_order_id ?? order?.id;
    const itemCode = text(order?.item_code) || text(order?.item?.item_code);
    const productName = text(order?.item?.item_name) || itemCode || "Chưa rõ sản phẩm";
    const productKey = itemCode ? `code:${itemCode}` : `name:${productName}`;
    const counts = Object.fromEntries(
      VIAL_DEFECTS.map(({ key: field }) => [field, vialCount(source[field])]),
    ) as Record<VialDefectKey, number | null>;
    const knownTotal = VIAL_DEFECTS.reduce((sum, { key: field }) => sum + (counts[field] ?? 0), 0);
    const complete = VIAL_DEFECTS.every(({ key: field }) => counts[field] !== null);
    const total = complete ? knownTotal : null;
    const result = !complete ? "incomplete" : knownTotal > 0 ? "defects" : "none";
    const bag = vialCount(source.bag_number);
    const creatorId = source.createdBy?.id ?? source.created_by_id;
    const creator =
      text(source.createdBy?.name) ||
      text(source.createdBy?.username) ||
      text(source.createdBy?.email) ||
      (creatorId == null ? "Chưa ghi nhận" : `Người dùng #${creatorId}`);
    return [
      {
        source,
        key,
        day,
        counts,
        knownTotal,
        total,
        result,
        orderId: orderId == null ? null : String(orderId),
        batchSize: vialCount(order?.planned_quatity ?? order?.planned_quantity),
        orderLabel: text(order?.production_order_code) || (orderId == null ? "Chưa rõ lệnh" : `#${orderId}`),
        itemCode,
        productKey,
        product: itemCode && productName !== itemCode ? `${productName} (${itemCode})` : productName,
        lot: text(order?.lot_no) || "Chưa ghi nhận",
        bag: bag !== null && bag > 0 ? bag : null,
        creator,
        creatorKey: creatorId == null ? `name:${creator}` : `id:${creatorId}`,
        cancelled: isCancelledProductionOrder(order?.status),
      },
    ];
  });
}
export type VialInspectionRow = ReturnType<typeof buildVialInspectionRows>[number];

export function filterVialInspectionRows(rows: VialInspectionRow[], filters: VialReportFilters) {
  const query = searchText(filters.search.trim());
  return rows.filter(
    (row) =>
      (filters.includeCancelled || !row.cancelled) &&
      (filters.product === "all" || row.productKey === filters.product) &&
      (filters.order === "all" || row.orderId === filters.order) &&
      (filters.creator === "all" || row.creatorKey === filters.creator) &&
      (filters.result === "all" || row.result === filters.result) &&
      (filters.defect === "all" || (row.counts[filters.defect as VialDefectKey] ?? 0) > 0) &&
      (!query ||
        searchText(
          [
            row.source.id,
            row.orderId,
            row.orderLabel,
            row.product,
            row.lot,
            row.bag,
            row.creator,
            row.source.note,
          ].join(" "),
        ).includes(query)),
  );
}

export function buildVialInspectionReport(rows: VialInspectionRow[], range: VialReportRange) {
  const dated = rows.filter((row): row is VialInspectionRow & { day: string } => row.day !== null);
  const days = dated.map((row) => row.day).sort();
  const commonRange = range ?? (days.length ? { from: days[0], to: days[days.length - 1] } : null);
  const time = buildTimeSummary(days, commonRange);
  const series = (subset: VialInspectionRow[], quantity: (row: VialInspectionRow) => number) => {
    const valid = subset.filter((row): row is VialInspectionRow & { day: string } => row.day !== null);
    return buildTimeSummary(
      valid.map((row) => row.day),
      commonRange,
      valid.map(quantity),
    ).points;
  };
  const defectSeries = VIAL_DEFECTS.map(({ key }) => series(dated, (row) => row.counts[key] ?? 0));
  const orderBatchSizes = new Map<string, number | null>();
  rows.forEach((row) => {
    if (row.orderId !== null && !orderBatchSizes.has(row.orderId)) {
      orderBatchSizes.set(row.orderId, row.batchSize !== null && row.batchSize > 0 ? row.batchSize : null);
    }
  });
  const orderRows = new Map<string, VialInspectionRow[]>();
  dated.forEach((row) => {
    const key = row.orderId ?? `unknown:${row.key}`;
    const subset = orderRows.get(key) ?? [];
    subset.push(row);
    orderRows.set(key, subset);
  });
  const batchSeries = Array.from(orderRows, ([key, subset]) => ({
    batchSize: orderBatchSizes.get(key) ?? null,
    points: series(subset, () => 1),
  }));
  let cumulative = 0;
  const timeline = time.points.map((point, index) => {
    const values = VIAL_DEFECTS.map((_, defectIndex) => defectSeries[defectIndex][index]?.count ?? 0);
    const errors = values.reduce((sum, value) => sum + value, 0);
    cumulative += errors;
    const batches = batchSeries.filter((batch) => (batch.points[index]?.count ?? 0) > 0);
    const batchSize = batches.length && batches.every((batch) => batch.batchSize !== null)
      ? batches.reduce((sum, batch) => sum + batch.batchSize!, 0)
      : null;
    return {
      ...point,
      errors,
      cumulative,
      batchSize,
      fiber_vial_count: values[0],
      particulate_count: values[1],
      damaged_count: values[2],
      other_defect_count: values[3],
    };
  });
  const totalErrors = rows.reduce((sum, row) => sum + row.knownTotal, 0);
  const defects = VIAL_DEFECTS.map((defect) => ({
    ...defect,
    count: rows.reduce((sum, row) => sum + (row.counts[defect.key] ?? 0), 0),
  }));
  const groupRows = (key: (row: VialInspectionRow) => string, label: (row: VialInspectionRow) => string) => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        records: number;
        errors: number;
        bags: Set<string>;
        fiber_vial_count: number;
        particulate_count: number;
        damaged_count: number;
        other_defect_count: number;
        incomplete: number;
        product: string;
        orderId: string | null;
        orderLabel: string;
        lot: string;
      }
    >();
    rows.forEach((row) => {
      const groupKey = key(row);
      const group = groups.get(groupKey) ?? {
        key: groupKey,
        name: label(row),
        records: 0,
        errors: 0,
        bags: new Set<string>(),
        fiber_vial_count: 0,
        particulate_count: 0,
        damaged_count: 0,
        other_defect_count: 0,
        incomplete: 0,
        product: row.product,
        orderId: row.orderId,
        orderLabel: row.orderLabel,
        lot: row.lot,
      };
      group.records += 1;
      group.errors += row.knownTotal;
      if (row.bag !== null && row.orderId !== null) group.bags.add(`${row.orderId}:${row.bag}`);
      if (row.total === null) group.incomplete += 1;
      VIAL_DEFECTS.forEach(({ key: field }) => {
        group[field] += row.counts[field] ?? 0;
      });
      groups.set(groupKey, group);
    });
    return Array.from(groups.values(), ({ bags, ...group }) => ({ ...group, bagCount: bags.size })).sort(
      (a, b) => b.errors - a.errors || b.records - a.records || a.name.localeCompare(b.name, "vi"),
    );
  };
  const complete = rows.filter((row) => row.total !== null);
  const withDefects = complete.filter((row) => row.total! > 0).length;
  const histogram = [
    { name: "0", min: 0, max: 0 },
    { name: "1–5", min: 1, max: 5 },
    { name: "6–10", min: 6, max: 10 },
    { name: "11–20", min: 11, max: 20 },
    { name: ">20", min: 21, max: Infinity },
  ].map((bucket) => ({
    name: bucket.name,
    count: complete.filter((row) => row.total! >= bucket.min && row.total! <= bucket.max).length,
  }));
  return {
    total: rows.length,
    totalErrors,
    orderCount: new Set(rows.map((row) => row.orderId).filter((id) => id !== null)).size,
    productCount: new Set(rows.map((row) => row.productKey)).size,
    bagCount: new Set(
      rows.filter((row) => row.orderId !== null && row.bag !== null).map((row) => `${row.orderId}:${row.bag}`),
    ).size,
    completeCount: complete.length,
    withDefects,
    withoutDefects: complete.length - withDefects,
    incompleteCount: rows.length - complete.length,
    defectRecordRate: complete.length ? (withDefects / complete.length) * 100 : null,
    averageErrors: complete.length ? complete.reduce((sum, row) => sum + row.total!, 0) / complete.length : null,
    undatedCount: rows.filter((row) => row.day === null).length,
    missingBagCount: rows.filter((row) => row.bag === null).length,
    missingOrderCount: rows.filter((row) => row.orderId === null).length,
    cancelledCount: rows.filter((row) => row.cancelled).length,
    timeline,
    resolutionLabel: time.resolutionLabel,
    defects,
    histogram,
    products: groupRows(
      (row) => row.productKey,
      (row) => row.product,
    ),
    orders: groupRows(
      (row) => row.orderId ?? `unknown:${row.key}`,
      (row) => `${row.orderLabel} · Lô ${row.lot}`,
    ).map((order) => ({ ...order, batchSize: orderBatchSizes.get(order.orderId ?? "") ?? null })),
    creators: groupRows(
      (row) => row.creatorKey,
      (row) => row.creator,
    ).sort((a, b) => b.records - a.records),
  };
}
