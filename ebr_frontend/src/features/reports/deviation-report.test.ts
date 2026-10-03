import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDeviationReport,
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
    report.heatmap.reduce((sum, point) => sum + point.weekdays.reduce((a, b) => a + b, 0), 0),
    3,
  );
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

