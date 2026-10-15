import assert from "node:assert/strict";
import { test } from "node:test";
import { formatQuantitiesByUnit } from "./utils";

test("totals quantities only within the same unit", () => {
  const result = formatQuantitiesByUnit(
    [
      { unit: " kg ", quantity: "1,25" },
      { unit: "kg", quantity: 2 },
      { unit: "hộp", quantity: 4 },
    ],
    (item) => item.quantity,
  );
  assert.equal(result, "3,25 kg; 4 hộp");
});

test("separates missing units and preserves zero quantities", () => {
  const result = formatQuantitiesByUnit(
    [
      { unit: null, quantity: 2 },
      { unit: "", quantity: 1 },
      { unit: "hộp", quantity: 0 },
    ],
    (item) => item.quantity,
  );
  assert.equal(result, "3 chưa rõ đơn vị; 0 hộp");
});

test("shows zero for an empty collection", () => {
  assert.equal(
    formatQuantitiesByUnit([], () => 0),
    "0",
  );
});
