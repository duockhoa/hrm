import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOutputLossRows, sumUnitQuantities } from "./output-loss-report";
import type { ReportProductionOrder } from "./production-report";

const order = (id: number, extra: Partial<ReportProductionOrder> = {}): ReportProductionOrder => ({
  id, item_code: "TP01", lot_no: `LOT${id}`, status: "R", start_date: "2026-10-01", ...extra,
});

test("joins summaries to finished lots, excludes cancelled and out-of-range orders, deduplicates records", () => {
  const packaging = { id: 1, production_order_id: "1", unit: "hộp", pendingProcessItems: [{ pending_quantity: "2.5" }], pendingCancellationItems: [{ cancellation_quantity: 3 }] };
  const rows = buildOutputLossRows(
    [order(1), order(1), order(2), order(3, { item_code: "BTP01" }), order(4, { status: "C" }), order(5, { start_date: "2026-09-01" })],
    [{ id: 1, production_order_id: "1", total_quantity: 120 }, { id: "1", production_order_id: 1, total_quantity: 999 }, { id: 2, production_order_id: 1, package_count: 2, boxes_per_package: 10, loose_box_count: 1 }],
    [packaging, packaging, { id: 2, production_order_id: 1, unit: "kg", pendingProcessItems: [{ pending_quantity: 4 }], pendingCancellationItems: [{ cancellation_quantity: "1.25" }] }],
    { from: "2026-10-01", to: "2026-10-05" },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].actual, 141);
  assert.deepEqual(rows[0].pending, { hộp: 2.5, kg: 4 });
  assert.deepEqual(rows[0].cancellation, { hộp: 3, kg: 1.25 });
  assert.equal(rows[1].actual, null);
  assert.equal(rows[1].hasPackagingSummary, false);
});

test("preserves zero output and separates units including unspecified units", () => {
  const rows = buildOutputLossRows([order(1), order(2)], [{ production_order_id: 1, total_quantity: 0 }], [
    { production_order_id: 1, unit: "box", pendingProcessItems: [{ pending_quantity: 2 }] },
    { production_order_id: 1, unit: "hộp", pendingProcessItems: [{ pending_quantity: 3 }] },
    { production_order_id: 2, pending_process_items: [{ pending_quantity: 4 }], pending_cancellation_items: [] },
  ], null);
  assert.equal(rows[0].actual, 0);
  assert.deepEqual(sumUnitQuantities(rows.map((row) => row.pending)), { hộp: 5, "chưa rõ đơn vị": 4 });
  assert.deepEqual(rows[1].cancellation, {});
  assert.equal(rows[1].hasPackagingSummary, true);
});
