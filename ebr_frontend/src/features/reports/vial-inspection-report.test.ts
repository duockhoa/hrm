import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildVialInspectionReport,
  buildVialInspectionRows,
  EMPTY_VIAL_FILTERS,
  filterVialInspectionRows,
  vialCount,
  type ReportVialInspection,
} from "./vial-inspection-report";

const range = { from: "2026-10-01", to: "2026-10-04" };
const check = (id: number, extra: Partial<ReportVialInspection> = {}): ReportVialInspection => ({
  id,
  production_order_id: 1,
  bag_number: 1,
  fiber_vial_count: 0,
  particulate_count: 0,
  damaged_count: 0,
  other_defect_count: 0,
  created_at: "2026-10-01",
  created_by_id: 1,
  productionOrder: { id: 1, item_code: "TP01", lot_no: "LO01", status: "R", item: { item_name: "Dung dịch A" } },
  ...extra,
});

test("deduplicates IDs and counts bag identifiers per order instead of summing them", () => {
  const rows = buildVialInspectionRows(
    [
      check(1, { bag_number: 99, fiber_vial_count: 2 }),
      { ...check(1), id: "1" },
      check(2, { bag_number: "99", particulate_count: 3 }),
      check(3, { production_order_id: "2", bag_number: 99, damaged_count: 4 }),
      check(4, { bag_number: 100 }),
    ],
    range,
  );
  const report = buildVialInspectionReport(rows, range);
  assert.equal(report.total, 4);
  assert.equal(report.bagCount, 3);
  assert.equal(report.orderCount, 2);
  assert.equal(report.totalErrors, 9);
  assert.equal(report.orders.find((order) => order.orderId === "1")?.bagCount, 2);
});

test("uses Vietnam record dates rather than manufacture dates, with valid update fallback", () => {
  const rows = buildVialInspectionRows(
    [
      check(1, { created_at: "2026-09-30T18:00:00Z", productionOrder: { date_manufacture: "2025-01-01" } }),
      check(2, { created_at: "invalid", updated_at: "2026-10-02" }),
      check(3, { created_at: null }),
      check(4, { created_at: "2026-09-30" }),
    ],
    range,
  );
  assert.deepEqual(
    rows.map((row) => [row.source.id, row.day]),
    [
      [1, "2026-10-01"],
      [2, "2026-10-02"],
    ],
  );
  const all = buildVialInspectionRows([check(1, { created_at: null }), check(2)], null);
  const report = buildVialInspectionReport(all, null);
  assert.equal(report.total, 2);
  assert.equal(report.undatedCount, 1);
  assert.equal(
    report.timeline.reduce((sum, point) => sum + point.count, 0),
    1,
  );
});

test("zero is a valid observation, incomplete records do not become defect-free records", () => {
  const rows = buildVialInspectionRows(
    [
      check(1),
      check(2, { fiber_vial_count: 2 }),
      check(3, { fiber_vial_count: null, damaged_count: 5 }),
      check(4, { particulate_count: "invalid" }),
    ],
    range,
  );
  const report = buildVialInspectionReport(rows, range);
  assert.equal(report.withoutDefects, 1);
  assert.equal(report.withDefects, 1);
  assert.equal(report.incompleteCount, 2);
  assert.equal(report.completeCount, 2);
  assert.equal(report.defectRecordRate, 50);
  assert.equal(report.averageErrors, 1);
  assert.equal(report.totalErrors, 7); // Valid counts in incomplete records are still reported.
  assert.equal(rows[2].total, null);
  assert.equal(rows[2].result, "incomplete");
});

test("combines product, order, creator, defect, result and accent-insensitive search filters", () => {
  const rows = buildVialInspectionRows(
    [
      check(1, { fiber_vial_count: 2, note: "Cần kiểm tra", createdBy: { id: 7, name: "Nguyễn An" } }),
      check(2, { createdBy: { id: 8, name: "Nguyễn An" } }),
    ],
    range,
  );
  const filters = {
    ...EMPTY_VIAL_FILTERS,
    product: "code:TP01",
    order: "1",
    creator: "id:7",
    defect: "fiber_vial_count",
    result: "defects",
    search: "can kiem tra",
  };
  assert.deepEqual(
    filterVialInspectionRows(rows, filters).map((row) => row.source.id),
    [1],
  );
  assert.equal(filterVialInspectionRows(rows, { ...filters, search: "nguyen an" }).length, 1);
  assert.equal(filterVialInspectionRows(rows, { ...filters, result: "none" }).length, 0);
  assert.equal(buildVialInspectionReport(rows, range).creators.length, 2);
});

test("excludes cancelled orders by default and keeps records available on explicit inclusion", () => {
  const rows = buildVialInspectionRows(
    [check(1), check(2, { productionOrder: { status: "boposCancelled" }, damaged_count: 5 })],
    range,
  );
  assert.equal(filterVialInspectionRows(rows, EMPTY_VIAL_FILTERS).length, 1);
  const report = buildVialInspectionReport(
    filterVialInspectionRows(rows, { ...EMPTY_VIAL_FILTERS, includeCancelled: true }),
    range,
  );
  assert.equal(report.total, 2);
  assert.equal(report.cancelledCount, 1);
  assert.equal(report.totalErrors, 5);
});

test("all-time defect series align across empty months and heatmap sums correct weekdays", () => {
  const rows = buildVialInspectionRows(
    [
      check(1, { created_at: "2026-01-01", fiber_vial_count: 2 }),
      check(2, { created_at: "2026-06-01", damaged_count: 4 }),
      check(3, { created_at: "2026-10-01", particulate_count: 3 }),
    ],
    null,
  );
  const report = buildVialInspectionReport(rows, null);
  assert.equal(report.timeline.length, 10);
  assert.deepEqual(
    report.timeline
      .filter((point) => point.count)
      .map((point) => [point.key, point.fiber_vial_count, point.damaged_count, point.particulate_count]),
    [
      ["2026-01", 2, 0, 0],
      ["2026-06", 0, 4, 0],
      ["2026-10", 0, 0, 3],
    ],
  );
  assert.equal(report.timeline.at(-1)?.cumulative, 9);
  assert.equal(report.heatmap[0].weekdays[3], 2);
  assert.equal(report.heatmap[5].weekdays[0], 4);
  assert.equal(
    report.heatmap.reduce((sum, point) => sum + point.weekdays.reduce((a, b) => a + b, 0), 0),
    9,
  );
  assert.equal(report.pareto[0].key, "damaged_count");
  assert.equal(report.pareto.at(-1)?.cumulative, 100);
});

test("histogram bucket boundaries cover each complete record exactly once", () => {
  const counts = [0, 1, 5, 6, 10, 11, 20, 21];
  const report = buildVialInspectionReport(
    buildVialInspectionRows(
      counts.map((value, id) => check(id, { fiber_vial_count: value })),
      range,
    ),
    range,
  );
  assert.deepEqual(
    report.histogram.map((point) => point.count),
    [1, 2, 2, 2, 1],
  );
  assert.equal(report.scatter.length, 8);
});

test("handles missing order/bag IDs, strict counts, and empty data without invented rates", () => {
  assert.equal(vialCount(0), 0);
  for (const value of [null, "", -1, "1.5", "1e2", Number.MAX_SAFE_INTEGER + 1]) assert.equal(vialCount(value), null);
  const rows = buildVialInspectionRows(
    [
      check(1, { production_order_id: null, productionOrder: null, bag_number: 0 }),
      check(2, { production_order_id: null, productionOrder: null, bag_number: 99 }),
    ],
    range,
  );
  const report = buildVialInspectionReport(rows, range);
  assert.equal(report.bagCount, 0);
  assert.equal(report.missingBagCount, 1);
  assert.equal(report.missingOrderCount, 2);
  assert.equal(report.orders.length, 2);
  const empty = buildVialInspectionReport([], null);
  assert.equal(empty.defectRecordRate, null);
  assert.equal(empty.averageErrors, null);
  assert.deepEqual(empty.timeline, []);
});
