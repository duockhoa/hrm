import type {
  CreateMixingActivityTemplateStageStepPayload,
  MixingActivityTemplateStageStep,
  UpdateMixingActivityTemplateStageStepPayload,
} from "@/features/mixing-activity-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchByStageId = async (
  stageId: string | number,
): Promise<MixingActivityTemplateStageStep[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStageSteps(stageId),
  );
  return response.data;
};

const fetchById = async (
  stepId: string | number,
): Promise<MixingActivityTemplateStageStep> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStageStepDetail(stepId),
  );
  return response.data;
};

const create = async (
  stageId: string | number,
  payload: CreateMixingActivityTemplateStageStepPayload,
): Promise<MixingActivityTemplateStageStep> => {
  const response = await axiosClient.post(
    API_ROUTES.items.mixingActivityTemplateStageSteps(stageId),
    payload,
  );
  return response.data;
};

const update = async (
  stepId: string | number,
  payload: UpdateMixingActivityTemplateStageStepPayload,
): Promise<MixingActivityTemplateStageStep> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.mixingActivityTemplateStageStepDetail(stepId),
    payload,
  );
  return response.data;
};

const remove = async (
  stepId: string | number,
): Promise<MixingActivityTemplateStageStep> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.mixingActivityTemplateStageStepDetail(stepId),
  );
  return response.data;
};

const mixingActivityTemplateStageStepsService = {
  fetchByStageId,
  fetchById,
  create,
  update,
  delete: remove,
};

export default mixingActivityTemplateStageStepsService;
