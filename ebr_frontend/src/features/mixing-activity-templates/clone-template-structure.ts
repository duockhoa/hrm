import {
  mixingActivityTemplateStagesService,
  mixingActivityTemplateStageStepParametersService,
  mixingActivityTemplateStageStepsService,
} from "@/services/index.service";

export const cloneMixingActivityTemplateStructure = async (
  sourceTemplateId: string | number,
  targetTemplateId: string | number,
) => {
  const sourceStages = (
    await mixingActivityTemplateStagesService.fetchByTemplateId(sourceTemplateId)
  ).sort((first, second) => first.stage_order - second.stage_order);

  for (const sourceStage of sourceStages) {
    const targetStage = await mixingActivityTemplateStagesService.create(
      targetTemplateId,
      {
        stage_name: sourceStage.stage_name,
        stage_order: sourceStage.stage_order,
      },
    );
    const sourceSteps = (
      await mixingActivityTemplateStageStepsService.fetchByStageId(sourceStage.id)
    ).sort((first, second) => first.step_order - second.step_order);

    for (const sourceStep of sourceSteps) {
      const targetStep = await mixingActivityTemplateStageStepsService.create(
        targetStage.id,
        {
          step_name: sourceStep.step_name,
          step_order: sourceStep.step_order,
        },
      );
      const sourceParameters = (
        await mixingActivityTemplateStageStepParametersService.fetchByStepId(
          sourceStep.id,
        )
      ).sort(
        (first, second) => first.parameter_order - second.parameter_order,
      );

      for (const sourceParameter of sourceParameters) {
        await mixingActivityTemplateStageStepParametersService.create(
          targetStep.id,
          {
            parameter_name: sourceParameter.parameter_name,
            data_type: sourceParameter.data_type,
            unit: sourceParameter.unit?.trim() || null,
            requirement: sourceParameter.requirement,
            parameter_order: sourceParameter.parameter_order,
          },
        );
      }
    }
  }
};
