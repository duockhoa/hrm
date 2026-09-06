import type {
  MixingActivityTemplateParameterMutation,
  CreateMixingActivityTemplateStageStepParameterPayload,
  MixingActivityTemplateStageStepParameter,
  UpdateMixingActivityTemplateStageStepParameterPayload,
} from "@/features/mixing-activity-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchByStepId = async (
  stepId: string | number,
): Promise<MixingActivityTemplateStageStepParameter[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStageStepParameters(stepId),
  );
  return response.data;
};

const fetchById = async (
  parameterId: string | number,
): Promise<MixingActivityTemplateStageStepParameter> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStageStepParameterDetail(parameterId),
  );
  return response.data;
};

const create = async (
  stepId: string | number,
  payload: CreateMixingActivityTemplateStageStepParameterPayload,
): Promise<MixingActivityTemplateParameterMutation> => {
  const response = await axiosClient.post(
    API_ROUTES.items.mixingActivityTemplateStageStepParameters(stepId),
    payload,
  );
  return response.data;
};

const update = async (
  parameterId: string | number,
  payload: UpdateMixingActivityTemplateStageStepParameterPayload,
): Promise<MixingActivityTemplateParameterMutation> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.mixingActivityTemplateStageStepParameterDetail(parameterId),
    payload,
  );
  return response.data;
};

const remove = async (
  parameterId: string | number,
): Promise<MixingActivityTemplateParameterMutation> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.mixingActivityTemplateStageStepParameterDetail(parameterId),
  );
  return response.data;
};

const duplicate = async (id: string | number): Promise<MixingActivityTemplateParameterMutation> => {
  const response = await axiosClient.post(
    `${API_ROUTES.items.mixingActivityTemplateStageStepParameterDetail(id)}/duplicate`,
  );
  return response.data;
};

const move = async (
  id: string | number,
  direction: "up" | "down",
): Promise<MixingActivityTemplateParameterMutation> => {
  const response = await axiosClient.patch(
    `${API_ROUTES.items.mixingActivityTemplateStageStepParameterDetail(id)}/move`,
    { direction },
  );
  return response.data;
};

const mixingActivityTemplateStageStepParametersService = {
  fetchByStepId,
  fetchById,
  create,
  update,
  delete: remove,
  duplicate,
  move,
};

export default mixingActivityTemplateStageStepParametersService;
