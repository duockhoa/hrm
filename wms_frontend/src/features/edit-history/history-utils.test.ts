import assert from "node:assert/strict";
import test from "node:test";
import {
  formatHistoryDate,
  formatHistoryValue,
  getHistoryChanges,
} from "./history-utils";
import {
  CHECK_HISTORY_FIELDS,
  RECEIPT_HISTORY_FIELDS,
  SUMMARY_HISTORY_FIELDS,
} from "./warehouse-history-fields";
import type { EditHistoryEntry } from "./types";

const entry: EditHistoryEntry = {
  id: "1",
  entity_id: "7",
  entity_type: "warehouse_receipt_items",
  action: "UPDATE",
  actor_id: "5",
  actor_name: "Người sửa",
  reason: null,
  created_at: "2026-11-22T00:00:00Z",
  old_values: { quantity: "1.000", note: "Ghi chú", updated_at: "old" },
  new_values: { quantity: "0.000", note: null, updated_at: "new" },
};

test("shows changed fields including zero and cleared notes without technical timestamps", () => {
  const changes = getHistoryChanges(entry, RECEIPT_HISTORY_FIELDS);
  assert.deepEqual(
    changes.map((change) => change.key),
    ["quantity", "note"],
  );
  assert.equal(formatHistoryValue(changes[0].after, changes[0].field), "0");
  assert.equal(formatHistoryValue(changes[1].after, changes[1].field), "—");
});

test("labels check results and document types in Vietnamese", () => {
  assert.equal(
    formatHistoryValue(false, CHECK_HISTORY_FIELDS.is_passed),
    "Không đạt",
  );
  assert.equal(formatHistoryValue(true, CHECK_HISTORY_FIELDS.is_passed), "Đạt");
  assert.equal(
    formatHistoryValue("invoice", RECEIPT_HISTORY_FIELDS.attachment_type),
    "Ảnh HĐ",
  );
  assert.equal(
    formatHistoryValue("dispatch_note", RECEIPT_HISTORY_FIELDS.attachment_type),
    "Ảnh PXK",
  );
});

test("renders warehouse confirmation changes and Vietnam timestamps", () => {
  const changes = getHistoryChanges(
    {
      ...entry,
      old_values: { warehouse_confirmed_at: null },
      new_values: { warehouse_confirmed_at: "2026-11-22T00:00:00Z" },
    },
    SUMMARY_HISTORY_FIELDS,
  );
  assert.equal(changes.length, 1);
  assert.match(
    formatHistoryValue(changes[0].after, changes[0].field),
    /07:00:00/,
  );
  assert.match(formatHistoryDate(entry.created_at), /22\/11\/2026/);
});

test("retains only known fields from deleted attachments", () => {
  const changes = getHistoryChanges(
    {
      ...entry,
      action: "DELETE",
      new_values: null,
      old_values: {
        attachment_type: "coa",
        original_name: "coa.jpg",
        file_path: "/private/path",
        uploaded_by_id: 5,
      },
    },
    RECEIPT_HISTORY_FIELDS,
  );
  assert.deepEqual(
    changes.map((change) => change.key),
    ["attachment_type", "original_name", "uploaded_by_id"],
  );
  assert.ok(changes.every((change) => change.hasBefore && !change.hasAfter));
});
