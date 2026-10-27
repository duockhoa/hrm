import assert from "node:assert/strict";
import { test } from "node:test";
import { sortProductionOrderActions } from "./production-order-action-order";

const actions = [
  { keys: ["create_a"], visible: true },
  { keys: ["create_b", "legacy_b"], visible: true },
  { keys: ["create_c"], visible: false },
  { keys: ["create_required"], visible: true },
];
const entry = (key: string, order: number | null, enabled = true) => ({
  key,
  kind: "action",
  order,
  enabled,
});

test("sorts by item/snapshot order without mutating config or available actions", () => {
  const config = {
    actions: [
      entry("create_a", 20),
      entry("create_b", -1),
      entry("unknown", 0),
    ],
  };
  const before = JSON.stringify({ config, actions });
  assert.deepEqual(
    sortProductionOrderActions(config, actions).map((action) => action.keys[0]),
    ["create_b", "create_a", "create_c", "create_required"],
  );
  assert.equal(JSON.stringify({ config, actions }), before);
});

test("preserves existing order with absent config and tied order values", () => {
  assert.deepEqual(sortProductionOrderActions(undefined, actions), actions);
  assert.deepEqual(sortProductionOrderActions(null, actions), actions);
  assert.deepEqual(
    sortProductionOrderActions({ actions: [] }, actions),
    actions,
  );
  assert.deepEqual(
    sortProductionOrderActions(
      { actions: [entry("create_b", 0), entry("create_a", null)] },
      actions,
    ),
    actions,
  );
});

test("uses a legacy key only when the primary key is not configured", () => {
  assert.equal(
    sortProductionOrderActions(
      { actions: [entry("create_a", 5), entry("legacy_b", 1)] },
      actions,
    )[0],
    actions[1],
  );
  assert.equal(
    sortProductionOrderActions(
      {
        actions: [
          entry("create_a", 5),
          entry("create_b", 10),
          entry("legacy_b", 1),
        ],
      },
      actions,
    )[0],
    actions[0],
  );
});

test("preserves visibility decisions and mandatory buttons missing from config", () => {
  const result = sortProductionOrderActions(
    { actions: [entry("create_c", -1, false), entry("create_a", 2, false)] },
    actions,
  );
  assert.equal(result[0].visible, false);
  assert.ok(result.includes(actions[3]));
  assert.deepEqual(
    result.filter((action) => action.visible).map((action) => action.keys[0]),
    ["create_a", "create_b", "create_required"],
  );
});
