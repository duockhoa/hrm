import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProductionReport,
  buildProductionRows,
  EMPTY_PRODUCTION_FILTERS,
  filterProductionRows,
  productionState,
  summaryQuantity,
  type ReportProductionOrder,
} from "./production-report";

const range = { from: "2026-10-01", to: "2026-10-04" };
const lot = (id: number, extra: Partial<ReportProductionOrder> = {}): ReportProductionOrder => ({
  id,
  item_code: "TP01",
  status: "R",
  unit: "hộp",
  planned_quatity: 100,
  date_manufacture: "2026-10-01",
  ...extra,
});

test("joins numeric/string IDs, deduplicates orders and summary IDs, sums packaging output", () => {
  const rows = buildProductionRows(
    [lot(1), lot(1), lot(2)],
    [
      { id: 1, production_order_id: "1", package_count: 2, boxes_per_package: 12, loose_box_count: 1 },
      { id: "1", production_order_id: 1, total_quantity: 999 },
      { id: 2, productionOrder: { id: 1 }, total_quantity: 5 },
      {
        id: 3,
        production_order: { id: 2 },
        total_quantity: 0,
        package_count: 9,
        boxes_per_package: 12,
        loose_box_count: 0,
      },
    ],
    range,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].actual, 30);
  assert.equal(rows[0].summaries.length, 2);
  assert.equal(rows[1].actual, 0);
  assert.equal(rows[1].achievement, 0);
  assert.equal(buildProductionReport(rows, range, "hộp").actualQuantity, 30);
});

test("uses Vietnam production dates and valid creation fallback; undated orders are all-time only", () => {
  const orders = [
    lot(1, { date_manufacture: "2026-09-30T18:00:00Z" }),
    lot(2, { date_manufacture: "invalid", creation_date: "2026-10-02" }),
    lot(3, { date_manufacture: null, creation_date: null }),
    lot(4, { date_manufacture: "2026-09-30" }),
  ];
  const rows = buildProductionRows(orders, [], range);
  assert.deepEqual(
    rows.map((row) => [row.id, row.day, row.dateFallback]),
    [
      ["1", "2026-10-01", false],
      ["2", "2026-10-02", true],
    ],
  );
  const report = buildProductionReport(buildProductionRows(orders, [], null), null, "hộp");
  assert.equal(report.undatedCount, 1);
  assert.equal(
    report.timeline.reduce((sum, point) => sum + point.count, 0),
    3,
  );
  assert.equal(report.total, 4);
});

test("cancelled orders can be inspected without contributing to output or progress", () => {
  const rows = buildProductionRows(
    [lot(1), lot(2, { status: "boposCancelled" }), lot(3, { status: "Closed" })],
    [
      { production_order_id: 1, total_quantity: 50 },
      { production_order_id: 2, total_quantity: 999 },
    ],
    range,
  );
  assert.equal(filterProductionRows(rows, EMPTY_PRODUCTION_FILTERS).length, 2);
  assert.deepEqual(
    filterProductionRows(rows, { ...EMPTY_PRODUCTION_FILTERS, status: "cancelled" }).map((row) => row.id),
    ["2"],
  );
  const report = buildProductionReport(
    filterProductionRows(rows, { ...EMPTY_PRODUCTION_FILTERS, includeCancelled: true }),
    range,
    "hộp",
  );
  assert.equal(report.total, 3);
  assert.equal(report.activeCount, 2);
  assert.equal(report.closedCount, 1);
  assert.equal(report.cancelledCount, 1);
  assert.equal(report.plannedQuantity, 200);
  assert.equal(report.actualQuantity, 50);
  assert.equal(report.outputAchievement, 50);
});

test("compares only known box plans and actuals, preserving zero plans and missing results", () => {
  const rows = buildProductionRows(
    [
      lot(1, { planned_quatity: 200, unit: "BOX" }),
      lot(2, { unit: "kg" }),
      lot(3, { planned_quatity: 0 }),
      lot(4),
      lot(5, { item_code: "BTP01", unit: "kg" }),
      lot(6, { planned_quatity: null, unit: null }),
    ],
    [
      { production_order_id: 1, total_quantity: 150 },
      { production_order_id: 2, total_quantity: 40 },
      { production_order_id: 3, total_quantity: 10 },
      { production_order_id: 5, total_quantity: 999 },
    ],
    range,
  );
  assert.equal(rows[0].unit, "hộp");
  assert.equal(rows[0].achievement, 75);
  assert.equal(rows[1].achievement, null);
  assert.equal(rows[2].planned, 0);
  assert.equal(rows[2].achievement, null);
  assert.equal(rows[3].actual, null);
  assert.equal(rows[4].actual, null);
  const report = buildProductionReport(rows, range, "kg");
  assert.equal(report.plannedQuantity, 200);
  assert.equal(report.actualQuantity, 200);
  assert.equal(report.outputAchievement, 75);
  assert.equal(report.comparableCount, 1);
  assert.equal(report.incomparableCount, 2);
  assert.equal(report.pendingSummaryCount, 2);
  assert.equal(report.timeline[0].planned, 300);
  assert.equal(report.timeline[0].actual, 160);
});

test("adaptive all-time series stay aligned across empty months, and heatmap uses actual weekdays", () => {
  const rows = buildProductionRows(
    [
      lot(1, { date_manufacture: "2026-01-01", status: "P" }),
      lot(2, { date_manufacture: "2026-06-01", item_code: "BTP01" }),
      lot(3, { date_manufacture: "2026-10-01", status: "L" }),
    ],
    [{ production_order_id: 3, total_quantity: 80 }],
    null,
  );
  const report = buildProductionReport(rows, null, "hộp");
  assert.equal(report.timeline.length, 10);
  assert.deepEqual(
    report.timeline
      .filter((point) => point.count)
      .map((point) => [point.key, point.finished, point.semi, point.statusClosed, point.actual]),
    [
      ["2026-01", 1, 0, 0, 0],
      ["2026-06", 0, 1, 0, 0],
      ["2026-10", 1, 0, 1, 80],
    ],
  );
  assert.equal(report.timeline.at(-1)?.cumulativeOrders, 3);
  assert.equal(report.timeline.at(-1)?.cumulativePlanned, 200);
  assert.equal(report.timeline.at(-1)?.cumulativeActual, 80);
  assert.equal(report.heatmap[0].weekdays[3], 1); // Thursday, Jan 1.
  assert.equal(report.heatmap[5].weekdays[0], 1); // Monday, Jun 1.
  assert.equal(
    report.heatmap.reduce((sum, point) => sum + point.weekdays.reduce((a, b) => a + b, 0), 0),
    3,
  );
});

test("achievement buckets have non-overlapping boundaries including exactly 100%", () => {
  const quantities = [0, 79, 80, 94, 95, 99, 100, 101];
  const rows = buildProductionRows(
    quantities.map((_, index) => lot(index)),
    quantities.map((value, index) => ({ production_order_id: index, total_quantity: value })),
    range,
  );
  const report = buildProductionReport(rows, range, "hộp");
  assert.deepEqual(
    report.achievement.map((point) => point.count),
    [2, 2, 2, 1, 1],
  );
  assert.equal(report.scatter.length, 8);
});

test("combines filters and accent-insensitive search, grouping products by code", () => {
  const rows = buildProductionRows(
    [
      lot(1, { warehouse: "KHO1", item: { item_name: "Viên bổ sung" }, lot_no: "LO-001" }),
      lot(2, { warehouse: "KHO2", item: { item_name: "Tên cập nhật" }, status: "L" }),
      lot(3, { item_code: "BTP01" }),
    ],
    [],
    range,
  );
  assert.equal(buildProductionReport(rows, range, "hộp").productCount, 2);
  const filtered = filterProductionRows(rows, {
    ...EMPTY_PRODUCTION_FILTERS,
    product: "code:TP01",
    warehouse: "KHO1",
    status: "released",
    category: "finished",
    search: "vien bo sung",
  });
  assert.deepEqual(
    filtered.map((row) => row.id),
    ["1"],
  );
  assert.equal(filterProductionRows(rows, { ...EMPTY_PRODUCTION_FILTERS, search: "lo-001" }).length, 1);
});

test("invalid and missing summaries remain unknown, while explicit zero is valid", () => {
  assert.equal(summaryQuantity({ total_quantity: "invalid" }), null);
  assert.equal(summaryQuantity({ package_count: 1, boxes_per_package: 12 }), null);
  assert.equal(summaryQuantity({ total_quantity: 0 }), 0);
  const rows = buildProductionRows([lot(1)], [{ production_order_id: 1, total_quantity: "invalid" }], range);
  assert.equal(rows[0].actual, null);
  assert.equal(rows[0].achievement, null);
  assert.equal(buildProductionReport(rows, range, "hộp").invalidSummaryCount, 1);
  assert.equal(productionState(" boppReleased "), "released");
  assert.equal(productionState("Unexpected"), "other");
  const empty = buildProductionReport([], null, "hộp");
  assert.equal(empty.outputAchievement, null);
  assert.deepEqual(empty.timeline, []);
});
