import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTION_ORDER_HISTORY_FIELDS } from "./production-order-history-config";
import { formatHistoryValue } from "./history-utils";

test("every supported form has readable labels and a value type", () => {
  assert.equal(Object.keys(PRODUCTION_ORDER_HISTORY_FIELDS).length, 42);
  for (const [resource, fields] of Object.entries(
    PRODUCTION_ORDER_HISTORY_FIELDS,
  )) {
    assert(Object.keys(fields).length > 0, resource);
    for (const field of Object.values(fields)) {
      assert(field.label.trim().length > 0, resource);
      assert(!field.label.includes("_"), `${resource}: ${field.label}`);
      assert(field.type, `${resource}: ${field.label}`);
    }
  }
});

test("mixing/weighing/equipment histories include values from child rows", () => {
  assert.equal(
    PRODUCTION_ORDER_HISTORY_FIELDS["mixing-record"].result_value.label,
    "Kết quả",
  );
  assert.equal(
    PRODUCTION_ORDER_HISTORY_FIELDS["weighing-record"].net_weight.label,
    "Khối lượng tịnh",
  );
  assert.equal(
    PRODUCTION_ORDER_HISTORY_FIELDS["equipment-monitoring-record"].value.label,
    "Giá trị thông số",
  );
});

test("measurement histories retain six decimal places", () => {
  const field = PRODUCTION_ORDER_HISTORY_FIELDS["density-check"].density;
  assert.equal(formatHistoryValue("1.234567", field), "1,234567");
});

test("boolean and time fields use readable values", () => {
  assert.equal(
    formatHistoryValue(false, { label: "Kết quả", type: "boolean" }),
    "Không",
  );
  assert.match(
    formatHistoryValue("2026-11-06T18:30:00Z", {
      label: "Thời điểm",
      type: "date",
    }),
    /01:30:00/,
  );
});
