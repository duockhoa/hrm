import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFinishedProductOutput } from "./finished-product-output";
import { buildTimeSummary } from "./time-summary";

test("joins summaries by order ID, sums output, and keeps pending lots separate", () => {
  const report = buildFinishedProductOutput([
    { id: 1, start_date: "2026-10-01" },
    { id: "1", start_date: "2026-10-01" },
    { id: 2, start_date: "2026-10-02" },
    { id: 3, start_date: "2026-10-02", status: "cancelled" },
    { id: 4, start_date: "2026-09-30" },
  ], [
    { production_order_id: "1", package_count: "10", boxes_per_package: "12", loose_box_count: "3" },
    { productionOrder: { id: 1 }, total_quantity: "7" },
    { production_order_id: 3, total_quantity: 500 },
    { production_order_id: 4, total_quantity: 600 },
    { production_order_id: 99, total_quantity: 700 },
  ], { from: "2026-10-01", to: "2026-10-03" });
  assert.equal(report.totalQuantity, 130);
  assert.equal(report.lotCount, 2);
  assert.equal(report.summarizedLotCount, 1);
  assert.equal(report.pendingLotCount, 1);
  assert.deepEqual(report.points.map((point) => point.count), [130, 0, 0]);
});

test("uses Vietnam start dates and skips missing start dates even with a creation date", () => {
  const report = buildFinishedProductOutput([
    { id: 1, start_date: "2026-09-30T18:00:00Z", date_manufacture: "2026-09-01" },
    { id: 2, start_date: "", creation_date: "2026-10-01" },
  ], [
    { production_order_id: 1, total_quantity: 0, package_count: 10, boxes_per_package: 12 },
    { production_order: { id: 2 }, total_quantity: "", package_count: 2, boxes_per_package: 12, loose_box_count: 1 },
  ], { from: "2026-10-01", to: "2026-10-01" });
  assert.equal(report.summarizedLotCount, 1);
  assert.equal(report.totalQuantity, 0);
  assert.equal(report.points[0].count, 0);
});

test("all-time totals include undated lots while the timeline excludes them", () => {
  const report = buildFinishedProductOutput([
    { id: 1 },
    { id: 2, start_date: "2026-10-01" },
  ], [
    { production_order_id: 1, total_quantity: 15 },
    { production_order_id: 2, total_quantity: 10 },
  ], null);
  assert.equal(report.totalQuantity, 25);
  assert.equal(report.undatedLotCount, 1);
  assert.equal(report.points[0].count, 10);
});

test("time buckets sum quantities while existing lot charts still count records", () => {
  const range = { from: "2026-01-01", to: "2026-12-31" };
  const days = ["2026-01-01", "2026-01-31", "2026-02-01"];
  assert.deepEqual(buildTimeSummary(days, range, [10, 20, 5]).points.slice(0, 2).map((point) => point.count), [30, 5]);
  assert.deepEqual(buildTimeSummary(days, range).points.slice(0, 2).map((point) => point.count), [2, 1]);
  assert.deepEqual(buildTimeSummary(days, { from: range.to, to: range.from }).points, []);
});

test("planned output includes pending lots once and shares actual output time buckets", () => {
  const report = buildFinishedProductOutput([
    { id: 1, start_date: "2026-01-01", planned_quatity: "100" },
    { id: "1", start_date: "2026-01-01", planned_quatity: "100" },
    { id: 2, start_date: "2026-01-15", planned_quantity: 200 },
    { id: 3, start_date: "2026-02-01", planned_quatity: 0, planned_quantity: 500 },
    { id: 4, start_date: "2026-02-01", planned_quatity: 1000, status: "cancelled" },
    { id: 5, start_date: "2025-12-31", planned_quatity: 1000 },
  ], [
    { production_order_id: 1, total_quantity: 90 },
    { production_order_id: 1, total_quantity: 5 },
    { production_order_id: 3, total_quantity: 10 },
  ], { from: "2026-01-01", to: "2026-12-31" });
  assert.equal(report.totalPlannedQuantity, 300);
  assert.equal(report.totalQuantity, 105);
  assert.equal(report.pendingLotCount, 1);
  assert.deepEqual(report.points.slice(0, 2).map((point) => [point.plannedQuantity, point.actualQuantity]), [[300, 95], [0, 10]]);
});

test("planned output is available before any finished product summary exists", () => {
  const report = buildFinishedProductOutput([
    { id: 1, start_date: "2026-10-01", planned_quatity: 250 },
  ], [], { from: "2026-10-01", to: "2026-10-01" });
  assert.equal(report.totalPlannedQuantity, 250);
  assert.equal(report.summarizedLotCount, 0);
  assert.equal(report.points[0].plannedQuantity, 250);
  assert.equal(report.points[0].actualQuantity, 0);
});
