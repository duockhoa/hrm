import test from "node:test";
import assert from "node:assert/strict";
import {
  formatWeight,
  normalizeWeight,
  sumWeights,
  groupRequiredQuantities,
} from "./weight-utils";

test("accepts decimal comma and preserves all six fractional digits", () => {
  assert.equal(normalizeWeight(" 12,345678 "), "12.345678");
  assert.equal(normalizeWeight("0.000001"), "0.000001");
  assert.equal(normalizeWeight("999999999999.999999"), "999999999999.999999");
});

test("rejects zero, negatives, excess precision and mixed separators", () => {
  for (const value of [
    "",
    "0",
    "0,000000",
    "-1",
    "1e3",
    "0.0000001",
    "1000000000000",
    "1,000.2",
    "Infinity",
  ]) {
    assert.equal(normalizeWeight(value), null, value);
  }
});

test("adds repeated weighing amounts without floating point errors", () => {
  assert.equal(sumWeights(["0.1", "0.2"]), "0.3");
  assert.equal(sumWeights(["0.000001", "0.000001", "0.000001"]), "0.000003");
  assert.equal(sumWeights([]), "0");
});

test("merges required totals by material code and unit across different lots", () => {
  const rows = groupRequiredQuantities([
    {
      id: 1,
      item_code: "NL00404",
      unit: "Gam",
      planned_quantity: "130",
      lot_no: "A",
    },
    {
      id: 2,
      item_code: "NL00404",
      unit: "Gam",
      planned_quantity: "130",
      lot_no: "B",
    },
    {
      id: 3,
      item_code: "NL00405",
      unit: "Gam",
      planned_quantity: "0.1",
      lot_no: "C",
    },
    {
      id: 4,
      item_code: "NL00405",
      unit: "Gam",
      planned_quantity: "0.2",
      lot_no: "D",
    },
    {
      id: 5,
      item_code: "NL00404",
      unit: "kg",
      planned_quantity: "1",
      lot_no: "E",
    },
  ]);
  assert.deepEqual(
    rows.map(({ line, requiredTotal, requiredRowSpan }) => [
      line.id,
      requiredTotal,
      requiredRowSpan,
    ]),
    [
      [1, "260", 2],
      [2, "260", 0],
      [3, "0.3", 2],
      [4, "0.3", 0],
      [5, "1", 1],
    ],
  );
  assert.deepEqual(groupRequiredQuantities([]), []);
});

test("totals actual weights across lots, including negative corrections, without mixing units or codes", () => {
  const rows = groupRequiredQuantities([
    {
      item_code: "NL01",
      unit: "g",
      planned_quantity: "1",
      details: [
        { net_weight: "0.3", unit: "g" },
        { net_weight: "-0.1", unit: "g" },
      ],
    },
    {
      item_code: "NL01",
      unit: "g",
      planned_quantity: "1",
      details: [
        { net_weight: "0.2", unit: "g" },
        { net_weight: "1", unit: "kg" },
      ],
    },
    { item_code: "NL02", unit: "g", planned_quantity: "1", details: [] },
    {
      item_code: "NL01",
      unit: "kg",
      planned_quantity: "1",
      details: [{ net_weight: "-0.000001", unit: "kg" }],
    },
  ]);
  assert.deepEqual(rows[0].actualTotals, [
    { unit: "g", total: "0.4" },
    { unit: "kg", total: "1" },
  ]);
  assert.equal(rows[0].requiredRowSpan, 2);
  assert.equal(rows[1].requiredRowSpan, 0);
  assert.deepEqual(rows[2].actualTotals, []);
  assert.deepEqual(rows[3].actualTotals, [{ unit: "kg", total: "-0.000001" }]);
});

test("accepts negative actual weights while keeping required quantity positive", () => {
  for (const value of ["-1", "-0.000001", "-999999999999.999999"]) {
    assert.equal(normalizeWeight(value, true), value);
    assert.equal(normalizeWeight(value), null);
  }
  assert.equal(normalizeWeight(" -0,25 ", true), "-0.25");
  for (const value of [
    "-0",
    "-0.000000",
    "-1000000000000",
    "-0.0000001",
    "--1",
  ]) {
    assert.equal(normalizeWeight(value, true), null);
  }
});

test("subtracts negative weights precisely and retains negative fractional totals", () => {
  assert.equal(sumWeights(["1.25", "-0.3"]), "0.95");
  assert.equal(sumWeights(["-0.1", "-0.2"]), "-0.3");
  assert.equal(sumWeights(["-1.25", "0.2"]), "-1.05");
  assert.equal(sumWeights(["0.000001", "-0.000001"]), "0");
  assert.equal(
    sumWeights(["-999999999999.999999", "-0.000001"]),
    "-1000000000000",
  );
  assert.equal(formatWeight("-0.000001"), "-0,000001");
  assert.equal(formatWeight("-1234.560000"), "-1.234,56");
});

test("keeps exact totals even above the precision of a JavaScript number", () => {
  assert.equal(
    sumWeights(["999999999999.999999", "0.000001"]),
    "1000000000000",
  );
  assert.equal(
    sumWeights(["999999999999.999999", "999999999999.999999"]),
    "1999999999999.999998",
  );
});

test("formats Vietnamese quantities without rounding away fractional digits", () => {
  assert.equal(formatWeight("999999999999.999999"), "999.999.999.999,999999");
  assert.equal(formatWeight("12.340000"), "12,34");
  assert.equal(formatWeight("0.000001"), "0,000001");
});
