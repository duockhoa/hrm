import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatHistoryDate,
  formatHistoryValue,
  getHistoryChanges,
} from "./history-utils";
import type { EditHistoryEntry } from "./types";

const fields = {
  package_count: { label: "Số kiện", type: "number" },
  note: { label: "Ghi chú", type: "text" },
} as const;
const entry: EditHistoryEntry = {
  id: "1",
  entity_id: "7",
  entity_type: "production_order_finished_product_summaries",
  action: "UPDATE",
  old_values: null,
  new_values: null,
  actor_id: "3",
  actor_name: "Editor",
  reason: null,
  created_at: "2026-11-07T00:00:00Z",
};

test("shows changed business fields, including zero and clearing a value", () => {
  const changes = getHistoryChanges(
    {
      ...entry,
      old_values: {
        package_count: 1,
        note: "Kiểm đếm",
        updated_at: "old",
        created_by_id: 3,
      },
      new_values: {
        package_count: 0,
        note: null,
        updated_at: "new",
        created_by_id: 4,
      },
    },
    fields,
  );
  assert.deepEqual(
    changes.map(({ key }) => key),
    ["package_count", "note"],
  );
  assert.equal(formatHistoryValue(changes[0].after, changes[0].field), "0");
  assert.equal(formatHistoryValue(changes[1].after, changes[1].field), "—");
});

test("distinguishes missing snapshots from explicitly empty values", () => {
  const [change] = getHistoryChanges(
    { ...entry, new_values: { note: null } },
    fields,
  );
  assert.equal(change.hasBefore, false);
  assert.equal(change.hasAfter, true);
  assert.equal(change.after, null);
  assert.deepEqual(
    getHistoryChanges(
      { ...entry, old_values: { note: "Same" }, new_values: { note: "Same" } },
      fields,
    ),
    [],
  );
});

test("formats numbers in Vietnamese and preserves text verbatim", () => {
  assert.equal(formatHistoryValue(5013, fields.package_count), "5.013");
  assert.equal(formatHistoryValue("0001", fields.note), "0001");
});

test("uses Vietnam time even if the device is in another timezone", () => {
  assert.match(formatHistoryDate("2026-11-06T18:30:00Z"), /01:30:00/);
  assert.match(formatHistoryDate("2026-11-06T18:30:00Z"), /07\/11\/2026/);
});
