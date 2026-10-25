import test from "node:test";
import assert from "node:assert/strict";
import { formatWeight, normalizeWeight, sumWeights } from "./weight-utils";

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
