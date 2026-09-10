import type {
  MixingActivityTemplateTree,
  MixingActivityTemplateStageMutation,
  MixingActivityTemplateStepMutation,
  MixingActivityTemplateParameterMutation,
} from "./types";

// Sibling responses contain scalar fields. Preserve descendants already loaded
// in the detail cache, and use the returned subtree for new/copied nodes.
export function applyStageMutation(
  tree: MixingActivityTemplateTree,
  result: MixingActivityTemplateStageMutation,
): MixingActivityTemplateTree {
  return {
    ...tree,
    stages: result.siblings.map((stage) => ({
      ...stage,
      steps:
        stage.id === result.id && result.steps !== undefined
          ? result.steps
          : (tree.stages.find((current) => current.id === stage.id)?.steps ??
            []),
    })),
  };
}

export function applyStepMutation(
  tree: MixingActivityTemplateTree,
  stageId: number,
  result: MixingActivityTemplateStepMutation,
): MixingActivityTemplateTree {
  return {
    ...tree,
    stages: tree.stages.map((stage) =>
      stage.id !== stageId
        ? stage
        : {
            ...stage,
            steps: result.siblings.map((step) => ({
              ...step,
              parameters:
                step.id === result.id && result.parameters !== undefined
                  ? result.parameters
                  : (stage.steps.find((current) => current.id === step.id)
                      ?.parameters ?? []),
            })),
          },
    ),
  };
}

export function applyParameterMutation(
  tree: MixingActivityTemplateTree,
  stepId: number,
  result: MixingActivityTemplateParameterMutation,
): MixingActivityTemplateTree {
  return {
    ...tree,
    stages: tree.stages.map((stage) => ({
      ...stage,
      steps: stage.steps.map((step) =>
        step.id !== stepId
          ? step
          : {
              ...step,
              parameters: result.siblings,
            },
      ),
    })),
  };
}
