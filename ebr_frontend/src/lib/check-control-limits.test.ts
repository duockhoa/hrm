import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateFilmCoatedTabletWeightRequirement,
  calculateGranulesInBagNetWeightRequirement,
  calculateSemiFinishedNetWeightRequirement,
  calculateVialMassRequirement,
} from "../features/production-order-semi-finished-net-weight-checks/utils";
import {
  calculateSemiFinishedCapsuleGrossWeightRequirement,
  calculateSemiFinishedGrossWeightRequirement,
  calculateSemiFinishedSolutionPackageGrossWeightRequirement,
} from "../features/production-order-semi-finished-gross-weight-checks/utils";
import {
  calculatePackageVolumeRequirement,
  calculateVolumeRequirement,
} from "../features/production-order-volume-checks/utils";
import {
  storedControlLimits,
  type CheckControlLimits,
} from "./check-control-limits";

const specification = {
  lower_control_limit: "9,5",
  upper_control_limit: "10.5",
  lower_allowed_limit: "8",
  upper_allowed_limit: "12",
  unit: "ml",
};

function expectLimits(
  result: CheckControlLimits,
  lower: number | null,
  upper: number | null,
) {
  const payload = JSON.parse(JSON.stringify(result));
  assert.equal(payload.lower_limit, lower);
  assert.equal(payload.upper_limit, upper);
  if (lower !== null) assert.equal(typeof payload.lower_limit, "number");
  if (upper !== null) assert.equal(typeof payload.upper_limit, "number");
}

test("tablet and granules send numeric control limits, independent of allowed limits", () => {
  for (const calculate of [
    calculateSemiFinishedNetWeightRequirement,
    calculateGranulesInBagNetWeightRequirement,
  ]) {
    expectLimits(calculate({ ...specification, unit: "g" }), 9.5, 10.5);
  }
  expectLimits(
    calculateFilmCoatedTabletWeightRequirement({
      ...specification,
      film_coated_tablet_weight_lower_control_limit: "380,125",
      film_coated_tablet_weight_upper_control_limit: "420",
      film_coated_tablet_weight_lower_allowed_limit: "350",
      film_coated_tablet_weight_upper_allowed_limit: "450",
    }),
    380.125,
    420,
  );
});

test("gross granules and capsules add shell weight in the submitted unit", () => {
  expectLimits(
    calculateSemiFinishedGrossWeightRequirement(
      { ...specification, unit: "g" },
      0.125,
    ),
    9.625,
    10.625,
  );
  expectLimits(
    calculateSemiFinishedCapsuleGrossWeightRequirement(
      {
        ...specification,
        lower_control_limit: "0.38",
        upper_control_limit: "0.42",
        unit: "g",
      },
      50,
    ),
    430,
    470,
  );
});

test("solution and vial limits include density conversion and final rounding", () => {
  expectLimits(
    calculateVialMassRequirement(specification, 1.2, {
      title: "dịch trong lọ",
    }),
    11.35,
    12.55,
  );
  expectLimits(
    calculateVialMassRequirement(specification, 1.2, {
      title: "lọ",
      averageShellWeight: 2,
    }),
    13.35,
    14.55,
  );
  for (const label of ["gói dịch", "tuýp"]) {
    expectLimits(
      calculateSemiFinishedSolutionPackageGrossWeightRequirement(
        specification,
        2,
        1.2,
        label,
      ),
      13.35,
      14.55,
    );
  }
  expectLimits(
    calculateSemiFinishedSolutionPackageGrossWeightRequirement(
      {
        ...specification,
        lower_control_limit: 9500,
        upper_control_limit: 10500,
        unit: "mg",
      },
      2,
      null,
    ),
    11.5,
    12.5,
  );
});

test("volume forms send control limits after cylinder calibration", () => {
  for (const calculate of [
    calculateVolumeRequirement,
    calculatePackageVolumeRequirement,
  ]) {
    expectLimits(calculate(specification, "0,25"), 9.25, 10.25);
    expectLimits(calculate(specification), 9.5, 10.5);
  }
});

test("missing control limits never fall back to allowed limits or zero", () => {
  expectLimits(
    calculateSemiFinishedNetWeightRequirement({
      lower_allowed_limit: 8,
      upper_allowed_limit: 12,
    }),
    null,
    null,
  );
  expectLimits(
    calculateVolumeRequirement({ ...specification, lower_control_limit: null }),
    null,
    10.5,
  );
  expectLimits(
    calculateSemiFinishedGrossWeightRequirement(specification, null),
    null,
    null,
  );
  expectLimits(
    calculateVialMassRequirement(specification, null, { title: "dịch" }),
    null,
    null,
  );
  expectLimits(
    calculateSemiFinishedNetWeightRequirement({
      lower_control_limit: 0,
      upper_control_limit: " ",
    }),
    0,
    null,
  );
});

test("edit payloads preserve stored calculated limits as numbers", () => {
  expectLimits(
    storedControlLimits({ lower_limit: "0.380", upper_limit: "0.420" }),
    0.38,
    0.42,
  );
  expectLimits(storedControlLimits({}), null, null);
});
