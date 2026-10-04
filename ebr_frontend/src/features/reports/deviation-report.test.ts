import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDeviationReport,
  buildDeviationOrderRateReport,
  buildDeviationHeatmap,
  EMPTY_DEVIATION_FILTERS,
  filterDeviationRows,
  normalizeDeviation,
  type ReportDeviation,
} from "./deviation-report";

const today = "2026-10-03";
const rows = (sources: ReportDeviation[]) => sources.map((source) => normalizeDeviation(source, today));

test("normalizes Vietnam dates, fallback dates, and stages based on actual content", () => {
  const normalized = rows([
    { created_at: "2026-09-30T18:00:00Z", handling_plan: "   ", handling_result: "   " },
    { created_at: "invalid", updated_at: "2026-10-02", handling_plan: "Kiểm tra lại" },
    { created_at: "2026-10-03", handling_result: "Đã xử lý", approver: null },
    {},
  ]);
  assert.deepEqual(
    normalized.map((row) => [row.day, row.age, row.stage]),
    [
      ["2026-10-01", 2, "new"],
      ["2026-10-02", 1, "planned"],
      ["2026-10-03", 0, "result"],
      [null, null, "new"],
    ],
  );
});

test("order rates count every deviation, exclude cancelled orders and preserve rates above 100%", () => {
  const report = buildDeviationOrderRateReport(
    rows([
      { production_order_id: 1, created_at: "2026-09-30T18:00:00Z" },
      { production_order_id: 1, created_at: "2026-10-01" },
      { created_at: "2026-10-02" },
      {},
    ]),
    [
      { id: 1, date_manufacture: "2026-10-01" },
      { id: 2, date_manufacture: "2026-10-01", status: "boposcancelled" },
      { id: 3, creation_date: "2026-10-03" },
      { id: 4 },
    ],
    { from: "2026-10-01", to: "2026-10-03" },
  );
  assert.deepEqual(report.points.map((point) => [point.deviationCount, point.orderCount, point.rate]), [
    [2, 1, 200], [1, 0, null], [0, 1, 0],
  ]);
  assert.equal(report.undatedOrderCount, 1);
});

test("all-time order rates align months across both data sources and keep empty months", () => {
  const report = buildDeviationOrderRateReport(
    rows([{ created_at: "2026-06-03" }]),
    [{ id: 1, date_manufacture: "2026-01-01" }, { id: 2, created_at: "2026-10-01" }],
    null,
  );
  assert.equal(report.resolutionLabel, "tháng");
  assert.equal(report.points.length, 10);
  assert.equal(report.points[0].orderCount, 1);
  assert.equal(report.points[5].deviationCount, 1);
  assert.equal(report.points[5].rate, null);
  assert.equal(report.points[9].orderCount, 1);
  assert.deepEqual([report.points[1].deviationCount, report.points[1].orderCount, report.points[1].rate], [0, 0, null]);
});

test("order rates apply the selected date range to both series and share weekly boundaries", () => {
  const report = buildDeviationOrderRateReport(
    rows([
      { created_at: "2026-09-30" },
      { created_at: "2026-10-07" },
      { created_at: "2026-10-08" },
      { created_at: "2026-12-01" },
    ]),
    [
      { id: 1, date_manufacture: "2026-09-30" },
      { id: 2, date_manufacture: "2026-10-07" },
      { id: 3, updated_at: "2026-10-07T18:00:00Z" },
      { id: 4, creation_date: "2026-12-01" },
    ],
    { from: "2026-10-01", to: "2026-11-30" },
  );
  assert.equal(report.resolutionLabel, "tuần");
  assert.deepEqual(report.points.slice(0, 2).map((point) => [point.key, point.deviationCount, point.orderCount, point.rate]), [
    ["2026-10-01", 1, 1, 100], ["2026-10-08", 1, 1, 100],
  ]);
  assert.equal(report.points.reduce((sum, point) => sum + point.deviationCount, 0), 2);
  assert.equal(report.points.reduce((sum, point) => sum + point.orderCount, 0), 2);
});

test("order rates handle empty data and zero deviations without inventing a denominator", () => {
  assert.deepEqual(buildDeviationOrderRateReport([], [], null).points, []);
  const range = { from: "2026-10-01", to: "2026-10-01" };
  assert.equal(buildDeviationOrderRateReport([], [], range).points[0].rate, null);
  assert.equal(buildDeviationOrderRateReport([], [{ id: 1, date_manufacture: range.from }], range).points[0].rate, 0);
  assert.equal(buildDeviationOrderRateReport([], [], range).points[0].lotRate, null);
  assert.equal(buildDeviationOrderRateReport([], [{ id: 1, date_manufacture: range.from }], range).points[0].lotRate, 0);
});

test("lot rates count affected production lots once, using their production period", () => {
  const report = buildDeviationOrderRateReport(
    rows([
      { production_order_id: 1, created_at: "2026-10-01" },
      { production_order_id: "1", created_at: "2026-10-02" },
      { production_order: { id: 1 }, created_at: "2026-10-02" },
      { production_order_id: 3, created_at: "2026-10-01" },
      { production_order_id: 99, created_at: "2026-10-01" },
      { created_at: "2026-10-01" },
    ]),
    [
      { id: 1, date_manufacture: "2026-10-01" },
      { id: 2, date_manufacture: "2026-10-01" },
      { id: 3, date_manufacture: "2026-10-01", status: "cancelled" },
      { id: 4, date_manufacture: "2026-10-03" },
    ],
    { from: "2026-10-01", to: "2026-10-03" },
  );
  assert.deepEqual(report.points.map((point) => [point.lotCount, point.affectedLotCount, point.lotRate]), [
    [2, 1, 50], [0, 0, null], [1, 0, 0],
  ]);
});

test("lot rates deduplicate order IDs and ignore deviations outside the selected range", () => {
  const report = buildDeviationOrderRateReport(
    rows([
      { production_order_id: "1", created_at: "2026-10-08" },
      { production_order_id: 1, created_at: "2026-10-09" },
      { production_order_id: 2, created_at: "2026-09-30" },
    ]),
    [
      { id: 1, date_manufacture: "2026-10-02" },
      { id: "1", date_manufacture: "2026-10-02" },
      { id: 2, date_manufacture: "2026-10-03" },
    ],
    { from: "2026-10-01", to: "2026-11-30" },
  );
  assert.equal(report.resolutionLabel, "tuần");
  assert.equal(report.points[0].lotCount, 2);
  assert.equal(report.points[0].affectedLotCount, 1);
  assert.equal(report.points[0].lotRate, 50);
  assert.equal(report.points[1].lotRate, null);
});

test("product rates deduplicate products across lots and use the affected lot's production period", () => {
  const report = buildDeviationOrderRateReport(
    rows([
      { production_order_id: 1, created_at: "2026-10-02" },
      { production_order_id: "1", created_at: "2026-10-02" },
      { production_order_id: 2, created_at: "2026-10-02" },
      { production_order_id: 4, created_at: "2026-10-01" },
      { production_order_id: 5, created_at: "2026-10-01" },
      { production_order_id: 99, created_at: "2026-10-01" },
    ]),
    [
      { id: 1, item_code: "SP1", date_manufacture: "2026-10-01" },
      { id: "1", item_code: "SP1", date_manufacture: "2026-10-01" },
      { id: 2, item: { item_code: "SP1", item_name: "Tên khác" }, date_manufacture: "2026-10-01" },
      { id: 3, item_code: "SP2", date_manufacture: "2026-10-01" },
      { id: 4, item_code: "SP3", date_manufacture: "2026-10-01", status: "cancelled" },
      { id: 5, item_code: "SP4" },
      { id: 6, item_code: "SP1", date_manufacture: "2026-10-03" },
    ],
    { from: "2026-10-01", to: "2026-10-03" },
  );
  assert.deepEqual(report.points.map((point) => [point.productCount, point.affectedProductCount, point.productRate]), [
    [2, 1, 50], [0, 0, null], [1, 0, 0],
  ]);
});

test("product rates share weekly boundaries and respect deviation filters and date ranges", () => {
  const filtered = filterDeviationRows(rows([
    { production_order_id: 1, created_at: "2026-10-09", cause_classification: "Selected" },
    { production_order_id: 2, created_at: "2026-10-09", cause_classification: "Other" },
    { production_order_id: 3, created_at: "2026-09-30", cause_classification: "Selected" },
  ]), { ...EMPTY_DEVIATION_FILTERS, cause: "Selected" });
  const report = buildDeviationOrderRateReport(
    filtered,
    [
      { id: 1, item_code: "SP1", date_manufacture: "2026-10-02" },
      { id: 2, item_code: "SP2", date_manufacture: "2026-10-07" },
      { id: 3, item_code: "SP3", date_manufacture: "2026-10-03" },
      { id: 4, item_code: "SP1", date_manufacture: "2026-10-08" },
      { id: 5, item_code: "SP4", date_manufacture: "2026-09-30" },
    ],
    { from: "2026-10-01", to: "2026-11-30" },
  );
  assert.equal(report.resolutionLabel, "tuần");
  assert.deepEqual(report.points.slice(0, 3).map((point) => [point.productCount, point.affectedProductCount]), [
    [3, 1], [1, 0], [0, 0],
  ]);
  assert.ok(Math.abs(report.points[0].productRate! - 100 / 3) < 1e-10);
  assert.equal(report.points[1].productRate, 0);
  assert.equal(report.points[2].productRate, null);
});

test("product rates count distinct names without codes within each month or year", () => {
  const deviations = rows([{ production_order_id: 2, created_at: "2026-06-04" }]);
  const orders = [
    { id: 1, description: "Product A", date_manufacture: "2026-06-01" },
    { id: 2, item: { item_name: "Product A" }, date_manufacture: "2026-06-02" },
    { id: 3, description: "Product B", date_manufacture: "2026-06-03" },
    { id: 4, description: "Product A", date_manufacture: "2026-07-01" },
    { id: 5, description: "Product A", date_manufacture: "2026-01-01" },
    { id: 6, description: "Product A", date_manufacture: "2026-12-31" },
  ];
  const monthly = buildDeviationOrderRateReport(deviations, orders, null);
  assert.equal(monthly.resolutionLabel, "tháng");
  assert.deepEqual(monthly.points.slice(5, 7).map((point) => [point.productCount, point.affectedProductCount, point.productRate]), [
    [2, 1, 50], [1, 0, 0],
  ]);
  const yearly = buildDeviationOrderRateReport(deviations, orders, { from: "2025-01-01", to: "2027-12-31" });
  assert.equal(yearly.resolutionLabel, "năm");
  assert.deepEqual(yearly.points.map((point) => [point.productCount, point.affectedProductCount, point.productRate]), [
    [0, 0, null], [2, 1, 50], [0, 0, null],
  ]);
  assert.deepEqual(buildDeviationOrderRateReport([], [], null).points, []);
});

test("deduplicates order IDs and product codes, keeps undated records out of timeline", () => {
  const report = buildDeviationReport(
    rows([
      {
        production_order_id: 1,
        productionOrder: { item_code: "SP1", item: { item_name: "Tên cũ" } },
        created_at: "2026-10-01",
      },
      {
        production_order_id: "1",
        productionOrder: { item_code: "SP1", item: { item_name: "Tên mới" } },
        created_at: "2026-10-02",
        handling_result: "Đã xử lý",
      },
      { production_order: { id: 2, item_code: "SP2" }, handling_plan: "Kiểm tra" },
    ]),
    null,
  );
  assert.equal(report.total, 3);
  assert.equal(report.affectedOrders, 2);
  assert.equal(report.productCount, 2);
  assert.equal(report.products[0].count, 2);
  assert.equal(report.undatedCount, 1);
  assert.equal(report.unknownAgeCount, 1);
  assert.ok(Math.abs(report.resultRate - 100 / 3) < 1e-10);
  assert.deepEqual(
    report.timeline.map((point) => [point.count, point.cumulative, point.new, point.planned, point.result]),
    [
      [1, 1, 1, 0, 0],
      [1, 2, 0, 0, 1],
    ],
  );
});

test("counts missing handling plans independently of handling results", () => {
  const report = buildDeviationReport(
    rows([
      {},
      { handling_plan: null },
      { handling_plan: "   " },
      { handling_result: "Đã xử lý" },
      { handling_plan: "Kiểm tra" },
      { handling_plan: "Kiểm tra", handling_result: "Đã xử lý" },
    ]),
    null,
  );
  assert.equal(report.unplannedCount, 4);
  assert.equal(report.total, 6);
  assert.equal(buildDeviationReport([], null).unplannedCount, 0);
});

test("all-time stage buckets align with the common timeline, including empty months", () => {
  const report = buildDeviationReport(
    rows([
      { created_at: "2026-01-02" },
      { created_at: "2026-06-02", handling_plan: "Phương án" },
      { created_at: "2026-10-01", handling_result: "Kết quả" },
    ]),
    null,
  );
  assert.equal(report.resolutionLabel, "tháng");
  assert.equal(report.timeline.length, 10);
  assert.deepEqual(
    report.timeline.filter((point) => point.count).map((point) => [point.key, point.new, point.planned, point.result]),
    [
      ["2026-01", 1, 0, 0],
      ["2026-06", 0, 1, 0],
      ["2026-10", 0, 0, 1],
    ],
  );
  assert.equal(report.timeline.at(-1)?.cumulative, 3);
  assert.equal(
    report.heatmap.total,
    3,
  );
});

test("calendar heatmap counts individual Vietnam dates and fills missing days, independent of monthly trends", () => {
  const report = buildDeviationReport(
    rows([
      { created_at: "2026-05-04" },
      { created_at: "2026-05-04T17:30:00Z" }, // May 5 in Vietnam.
      { created_at: "2026-05-05" },
      { created_at: "2026-09-30" },
      {},
    ]),
    { from: "2026-05-01", to: "2026-10-31" },
  );
  const calendar = report.heatmap;
  const cells = calendar.weeks.flatMap((week) => week.days).filter((cell) => cell !== null);
  assert.equal(report.resolutionLabel, "tháng");
  assert.equal(cells.length, 184);
  assert.equal(calendar.total, 4);
  assert.equal(calendar.maxCount, 2);
  assert.deepEqual(calendar.weeks[0].days.slice(0, 5), [null, null, null, null, null]);
  assert.equal(calendar.weeks[0].days[5]?.day, "2026-05-01");
  assert.equal(cells.find((cell) => cell.day === "2026-05-04")?.count, 1);
  assert.equal(cells.find((cell) => cell.day === "2026-05-05")?.count, 2);
  assert.equal(cells.find((cell) => cell.day === "2026-05-06")?.count, 0);
  assert.equal(cells.reduce((sum, cell) => sum + cell.count, 0), 4);
  assert.deepEqual(calendar.months.map((month) => month.key), [
    "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
  ]);
});

test("calendar heatmap respects range edges, Sunday columns and four green intensity levels", () => {
  const calendar = buildDeviationHeatmap(
    ["2026-10-03", "2026-10-04", ...Array(2).fill("2026-10-05"), ...Array(3).fill("2026-10-06"), ...Array(4).fill("2026-10-07"), "2026-10-09"],
    { from: "2026-10-04", to: "2026-10-08" },
  );
  assert.equal(calendar.weeks.length, 1);
  assert.equal(calendar.weeks[0].days[0]?.day, "2026-10-04");
  assert.deepEqual(calendar.weeks[0].days.map((cell) => cell?.level ?? null), [1, 2, 3, 4, 0, null, null]);
  assert.equal(calendar.total, 10);
});

test("calendar heatmap handles empty ranges, leap days, year boundaries and all-time data", () => {
  assert.equal(buildDeviationHeatmap([], null).weeks.length, 0);
  assert.equal(buildDeviationHeatmap([], { from: "2026-10-02", to: "2026-10-01" }).weeks.length, 0);
  assert.equal(buildDeviationHeatmap([], { from: "2026-02-30", to: "2026-03-01" }).weeks.length, 0);
  const emptyRange = buildDeviationHeatmap([], { from: "2024-02-28", to: "2024-03-01" });
  assert.equal(emptyRange.total, 0);
  assert.equal(emptyRange.maxCount, 0);
  assert.deepEqual(emptyRange.weeks.flatMap((week) => week.days).filter((cell) => cell !== null).map((cell) => [cell.day, cell.count, cell.level]), [
    ["2024-02-28", 0, 0], ["2024-02-29", 0, 0], ["2024-03-01", 0, 0],
  ]);
  const allTime = buildDeviationHeatmap(["2027-01-01", "2026-12-31"], null);
  assert.equal(allTime.from, "2026-12-31");
  assert.equal(allTime.to, "2027-01-01");
  assert.deepEqual(allTime.months.map((month) => month.key), ["2026-12", "2027-01"]);
});

test("groups quantities by their own unit without inventing missing quantities or units", () => {
  const report = buildDeviationReport(
    rows([
      {
        affected_quantity: "12,5",
        affected_quantity_unit: " KG ",
        handled_quantity: "10",
        handled_quantity_unit: "kg",
        destroyed_quantity: "2",
        destroyed_quantity_unit: "hộp",
      },
      { affected_quantity: 0, affected_quantity_unit: "kg", handled_quantity: "4", handled_quantity_unit: "hộp" },
      { affected_quantity: "100", affected_quantity_unit: "", destroyed_quantity: null },
      { affected_quantity: "invalid" },
    ]),
    null,
  );
  assert.deepEqual(
    report.quantities.find((point) => point.unit === "kg"),
    { unit: "kg", affected: 12.5, handled: 10, destroyed: 0 },
  );
  assert.deepEqual(
    report.quantities.find((point) => point.unit === "hộp"),
    { unit: "hộp", affected: 0, handled: 4, destroyed: 2 },
  );
  assert.equal(report.quantities.length, 2);
  assert.equal(report.missingQuantity, 1);
  assert.equal(report.missingUnitCount, 1);
});

test("combines product, cause, stage and accent-insensitive search filters", () => {
  const normalized = rows([
    {
      id: 1,
      productionOrder: { item_code: "SP1", lot_no: "LOT-01" },
      cause_classification: "Con người",
      handling_plan: "Kiểm tra",
      deviation_content: "Đóng gói sai",
      reporter: { name: "Nguyễn An" },
    },
    { id: 2, productionOrder: { item_code: "SP2" }, cause_classification: "Con người", handling_result: "Xong" },
  ]);
  const filters = {
    ...EMPTY_DEVIATION_FILTERS,
    product: "code:SP1",
    cause: "Con người",
    stage: "planned",
    search: "dong goi",
  };
  assert.deepEqual(
    filterDeviationRows(normalized, filters).map((row) => row.source.id),
    [1],
  );
  assert.equal(filterDeviationRows(normalized, { ...filters, search: "nguyen an" }).length, 1);
  assert.equal(filterDeviationRows(normalized, { ...filters, stage: "result" }).length, 0);
});

test("Pareto counts all groups and age buckets include only records without results", () => {
  const report = buildDeviationReport(
    rows([
      { created_at: "2026-10-03", cause_classification: "Máy móc" },
      { created_at: "2026-09-26", cause_classification: "Máy móc" },
      { created_at: "2026-09-25", handling_plan: "Kiểm tra" },
      { created_at: "2026-07-01", handling_result: "Xong" },
      {},
    ]),
    null,
  );
  assert.equal(report.causes[0].count, 3);
  assert.equal(report.causes.at(-1)?.cumulative, 100);
  assert.deepEqual(
    report.ages.map((point) => point.count),
    [2, 1, 0, 0, 0],
  );
  assert.equal(report.oldestPending, 8);
  assert.equal(report.pendingCount, 4);
});

