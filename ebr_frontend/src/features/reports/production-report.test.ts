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
  start_date: "2026-10-01",
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

test("uses only Vietnam start dates; manufacture and creation dates cannot fill missing start dates", () => {
  const orders = [
    lot(1, { start_date: "2026-09-30T18:00:00Z", date_manufacture: "2026-09-01" }),
    lot(2, { start_date: "invalid", creation_date: "2026-10-02", date_manufacture: "2026-10-02" }),
    lot(3, { start_date: null, created_at: "2026-10-03" }),
    lot(4, { start_date: "2026-09-30", date_manufacture: "2026-10-01" }),
  ];
  const rows = buildProductionRows(orders, [], range);
  assert.deepEqual(
    rows.map((row) => [row.id, row.day]),
    [
      ["1", "2026-10-01"],
    ],
  );
  const report = buildProductionReport(buildProductionRows(orders, [], null), null, "hộp");
  assert.equal(report.undatedCount, 2);
  assert.equal(
    report.timeline.reduce((sum, point) => sum + point.count, 0),
    2,
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
      lot(1, { start_date: "2026-01-01", status: "P" }),
      lot(2, { start_date: "2026-06-01", item_code: "BTP01" }),
      lot(3, { start_date: "2026-10-01", status: "L" }),
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


test("uses product-line identity and labels, preserving legacy and unassigned products", () => {
  const rows = buildProductionRows(
    [
      lot(1, { item: { productionSpecification: { product_line_id: 99, product_line: "Cũ", productLine: { id: 7, code: "DC", name: "Dung dịch" } } } }),
      lot(2, { item: { productionSpecification: { product_line_id: "8" } } }),
      lot(3, { item: { productionSpecification: { productLine: { code: "NC" } } } }),
      lot(4, { item: { productionSpecification: { productLine: { name: "Viên nén" } } } }),
      lot(5, { item: { productionSpecification: { product_line: "  Thuốc bột  " } } }),
      lot(6),
      lot(7, { item: { productionSpecification: { deleted_at: "2026-10-02", productLine: { id: 7, code: "DC", name: "Dung dịch" } } } }),
    ],
    [],
    range,
  );
  assert.deepEqual(
    rows.map((row) => [row.productLineKey, row.productLine]),
    [
      ["id:7", "DC - Dung dịch"],
      ["id:8", "Dòng sản phẩm #8"],
      ["code:NC", "NC"],
      ["name:Viên nén", "Viên nén"],
      ["name:Thuốc bột", "Thuốc bột"],
      ["unknown", "Chưa ghi nhận dòng sản phẩm"],
      ["unknown", "Chưa ghi nhận dòng sản phẩm"],
    ],
  );
  const report = buildProductionReport(rows, range, "hộp");
  assert.equal(report.productLineCount, 5);
  assert.equal(report.missingProductLineCount, 2);
  assert.equal(report.productLines.find((line) => line.key === "unknown")?.count, 2);
});

test("groups renamed product lines by ID and combines line filters with product search", () => {
  const rows = buildProductionRows(
    [
      lot(1, { warehouse: "KHO1", item: { item_name: "Sản phẩm A", productionSpecification: { productLine: { id: 7, code: "DD", name: "Dung dịch" } } } }),
      lot(2, { item_code: "TP02", warehouse: "KHO2", status: "L", item: { productionSpecification: { productLine: { id: "7", code: "DD", name: "Dung dịch đổi tên" } } } }),
      lot(3, { item_code: "BTP01", item: { productionSpecification: { productLine: { id: 8, code: "VN", name: "Viên nén" } } } }),
    ],
    [],
    range,
  );
  const report = buildProductionReport(rows, range, "hộp");
  assert.equal(report.productLineCount, 2);
  const line = report.productLines.find((group) => group.key === "id:7");
  assert.equal(line?.count, 2);
  assert.equal(line?.productCount, 2);
  assert.deepEqual(
    filterProductionRows(rows, {
      ...EMPTY_PRODUCTION_FILTERS,
      productLine: "id:7",
      product: "code:TP01",
      category: "finished",
      status: "released",
      warehouse: "KHO1",
      search: "dung dich",
    }).map((row) => row.id),
    ["1"],
  );
  assert.deepEqual(
    filterProductionRows(rows, { ...EMPTY_PRODUCTION_FILTERS, productLine: "id:7", search: "dd" }).map((row) => row.id),
    ["1", "2"],
  );
  assert.deepEqual(
    filterProductionRows(rows, { ...EMPTY_PRODUCTION_FILTERS, productLine: "id:8", search: "vien nen" }).map((row) => row.id),
    ["3"],
  );
});

test("product-line output excludes cancelled orders, separates units, and weights achievement by plan", () => {
  const item = { productionSpecification: { productLine: { id: 7, name: "Dòng A" } } };
  const rows = buildProductionRows(
    [
      lot(1, { item, item_code: "TP01", status: "L", planned_quatity: 100 }),
      lot(2, { item, item_code: "TP02", planned_quatity: 300 }),
      lot(3, { item, item_code: "TP03", unit: "kg", planned_quatity: 10 }),
      lot(4, { item, item_code: "BTP01", status: "L", unit: "kg", planned_quatity: 20 }),
      lot(5, { item, item_code: "TP04", status: "P", planned_quatity: 0 }),
      lot(6, { item, item_code: "TP05", status: "P" }),
      lot(7, { item, item_code: "TP06", status: "Unexpected", planned_quatity: null }),
      lot(8, { item, item_code: "TP07", status: "Cancelled", planned_quatity: 999 }),
    ],
    [
      { production_order_id: 1, total_quantity: 50 },
      { production_order_id: 2, total_quantity: 300 },
      { production_order_id: 3, total_quantity: 90 },
      { production_order_id: 4, total_quantity: 999 },
      { production_order_id: 5, total_quantity: 0 },
      { production_order_id: 7, total_quantity: 20 },
      { production_order_id: 8, total_quantity: 999 },
    ],
    range,
  );
  const [line] = buildProductionReport(rows, range, "kg").productLines;
  assert.equal(line.count, 8);
  assert.equal(line.productCount, 8);
  assert.equal(line.activeCount, 7);
  assert.equal(line.open, 4);
  assert.equal(line.closed, 2);
  assert.equal(line.cancelled, 1);
  assert.equal(line.plannedOrders, 2);
  assert.equal(line.releasedOrders, 2);
  assert.equal(line.otherOrders, 1);
  assert.equal(line.planned, 30);
  assert.equal(line.plannedCount, 2);
  assert.equal(line.actual, 460);
  assert.equal(line.summarizedCount, 5);
  assert.equal(line.comparablePlanned, 400);
  assert.equal(line.comparableActual, 350);
  assert.equal(line.comparableCount, 2);
  assert.equal(line.outputAchievement, 87.5);
  const [boxLine] = buildProductionReport(rows, range, "hộp").productLines;
  assert.equal(boxLine.planned, 500);
  assert.equal(boxLine.plannedCount, 4);
  assert.equal(boxLine.actual, line.actual);
  assert.equal(boxLine.outputAchievement, line.outputAchievement);
});

test("product lines distinguish recorded zero output from missing results and empty reports", () => {
  const rows = buildProductionRows(
    [
      lot(1, { item: { productionSpecification: { productLine: { id: 1, name: "Đã tổng kết" } } } }),
      lot(2, { item: { productionSpecification: { productLine: { id: 2, name: "Chưa tổng kết" } } }, planned_quatity: 0 }),
      lot(3, { item: { productionSpecification: { productLine: { id: 2, name: "Chưa tổng kết" } } } }),
    ],
    [
      { production_order_id: 1, total_quantity: 0 },
      { production_order_id: 3, total_quantity: "invalid" },
    ],
    range,
  );
  const report = buildProductionReport(rows, range, "hộp");
  const recorded = report.productLines.find((line) => line.key === "id:1")!;
  assert.equal(recorded.actual, 0);
  assert.equal(recorded.summarizedCount, 1);
  assert.equal(recorded.comparableCount, 1);
  assert.equal(recorded.outputAchievement, 0);
  const missing = report.productLines.find((line) => line.key === "id:2")!;
  assert.equal(missing.actual, 0);
  assert.equal(missing.summarizedCount, 0);
  assert.equal(missing.comparableCount, 0);
  assert.equal(missing.outputAchievement, null);
  const empty = buildProductionReport([], null, "hộp");
  assert.equal(empty.productLineCount, 0);
  assert.equal(empty.missingProductLineCount, 0);
  assert.deepEqual(empty.productLines, []);
});
