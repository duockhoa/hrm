import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyParameterMutation,
  applyStageMutation,
  applyStepMutation,
} from "./tree-cache";
import type { MixingActivityTemplateTree } from "./types";

const tree: MixingActivityTemplateTree = {
  id: 1,
  version: 1,
  batch_size: 100,
  unit_of_measure: "kg",
  stages: [
    {
      id: 10,
      stage_name: "Pha",
      stage_order: 1,
      steps: [
        {
          id: 20,
          step_name: "Khuấy",
          step_order: 1,
          parameters: [
            {
              id: 30,
              parameter_name: "Thời gian",
              parameter_order: 1,
              data_type: "number",
              requirement: "60",
              unit: "s",
            },
          ],
        },
        { id: 21, step_name: "Kiểm tra", step_order: 2, parameters: [] },
      ],
    },
    { id: 11, stage_name: "Kết thúc", stage_order: 2, steps: [] },
  ],
};

test("stage reorder preserves descendants and does not mutate the original tree", () => {
  const next = applyStageMutation(tree, {
    id: 10,
    stage_name: "Pha",
    stage_order: 2,
    siblings: [
      { id: 11, stage_name: "Kết thúc", stage_order: 1 },
      { id: 10, stage_name: "Pha mới", stage_order: 2 },
    ],
  });
  assert.equal(next.stages[1].stage_name, "Pha mới");
  assert.strictEqual(next.stages[1].steps, tree.stages[0].steps);
  assert.equal(tree.stages[0].stage_order, 1);
});

test("creating and copying stages includes their returned subtree; deleting removes it", () => {
  for (const steps of [[], [{ ...tree.stages[0].steps[0], id: 22 }]]) {
    const added = { id: 12, stage_name: "Bản sao", stage_order: 3 };
    const next = applyStageMutation(tree, {
      ...added,
      steps,
      siblings: [...tree.stages, added],
    });
    assert.deepEqual(next.stages[2].steps, steps);
    const deleted = applyStageMutation(next, {
      ...added,
      siblings: tree.stages,
    });
    assert.deepEqual(deleted, tree);
  }
});

test("step edits and reorder preserve parameters and other stages", () => {
  const next = applyStepMutation(tree, 10, {
    id: 20,
    step_name: "Khuấy mới",
    step_order: 2,
    siblings: [
      { id: 21, step_name: "Kiểm tra", step_order: 1 },
      { id: 20, step_name: "Khuấy mới", step_order: 2 },
    ],
  });
  assert.strictEqual(
    next.stages[0].steps[1].parameters,
    tree.stages[0].steps[0].parameters,
  );
  assert.strictEqual(next.stages[1], tree.stages[1]);
});

test("new/copied steps use returned parameters and deleted steps disappear", () => {
  for (const parameters of [
    [],
    [{ ...tree.stages[0].steps[0].parameters[0], id: 31 }],
  ]) {
    const added = { id: 22, step_name: "Bước mới", step_order: 3 };
    const next = applyStepMutation(tree, 10, {
      ...added,
      parameters,
      siblings: [...tree.stages[0].steps, added],
    });
    assert.deepEqual(next.stages[0].steps[2].parameters, parameters);
    const deleted = applyStepMutation(next, 10, {
      ...added,
      siblings: tree.stages[0].steps,
    });
    assert.deepEqual(deleted, tree);
  }
});

test("parameter changes survive later ancestor edits and support an empty sibling list", () => {
  const parameter = {
    ...tree.stages[0].steps[0].parameters[0],
    unit: "đơn vị tự nhập",
  };
  const edited = applyParameterMutation(tree, 20, {
    ...parameter,
    siblings: [parameter],
  });
  const renamed = applyStageMutation(edited, {
    id: 10,
    stage_name: "Pha",
    stage_order: 1,
    siblings: tree.stages.map((stage) => ({
      id: stage.id,
      stage_name: stage.stage_name,
      stage_order: stage.stage_order,
    })),
  });
  assert.equal(renamed.stages[0].steps[0].parameters[0].unit, parameter.unit);
  assert.equal(tree.stages[0].steps[0].parameters[0].unit, "s");
  const deleted = applyParameterMutation(renamed, 20, {
    ...parameter,
    siblings: [],
  });
  assert.deepEqual(deleted.stages[0].steps[0].parameters, []);
  assert.strictEqual(deleted.stages[0].steps[1], tree.stages[0].steps[1]);
});
