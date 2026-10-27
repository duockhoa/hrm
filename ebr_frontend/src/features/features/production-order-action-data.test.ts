import assert from "node:assert/strict";
import { test } from "node:test";
import { getActionsWithSectionData } from "./production-order-action-data";
import type { ProductionOrderCompleteness } from "../production-orders/types";

const completeness = (
  status: "has_data" | "missing" | "unavailable",
): ProductionOrderCompleteness => ({
  production_order_id: 1,
  configuration_source: "snapshot",
  rule_version: 1,
  required_count: 0,
  completed_count: 0,
  is_complete: true,
  required_sections: [],
  missing_sections: [],
  unavailable_sections: [],
  action_sections: [
    {
      key: "checks",
      label: "Checks",
      order: 0,
      status,
      record_count: status === "has_data" ? 1 : status === "missing" ? 0 : null,
      rule: "Has a saved record",
      action_keys: ["create_a", "create_b"],
    },
  ],
});

test("all actions for the same section are green when that section has data", () => {
  assert.deepEqual(
    [...getActionsWithSectionData(completeness("has_data"))],
    ["create_a", "create_b"],
  );
  assert.equal(
    getActionsWithSectionData(completeness("has_data")).has("unlinked"),
    false,
  );
});

test("missing, unavailable, legacy and loading statuses do not mark actions green", () => {
  assert.equal(getActionsWithSectionData(completeness("missing")).size, 0);
  assert.equal(getActionsWithSectionData(completeness("unavailable")).size, 0);
  assert.equal(getActionsWithSectionData(undefined).size, 0);
  assert.equal(
    getActionsWithSectionData({
      ...completeness("has_data"),
      action_sections: undefined,
    }).size,
    0,
  );
});

test("deleting the last record removes the green state", () => {
  assert.equal(
    getActionsWithSectionData(completeness("has_data")).has("create_a"),
    true,
  );
  assert.equal(
    getActionsWithSectionData(completeness("missing")).has("create_a"),
    false,
  );
});
