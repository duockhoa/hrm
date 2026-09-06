import type {
  MixingActivityTemplateStageMutation,
  CreateMixingActivityTemplateStagePayload,
  MixingActivityTemplateStage,
  UpdateMixingActivityTemplateStagePayload,
} from "@/features/mixing-activity-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchByTemplateId = async (
  templateId: string | number,
): Promise<MixingActivityTemplateStage[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStages(templateId),
  );
  return response.data;
};

const fetchById = async (
  stageId: string | number,
): Promise<MixingActivityTemplateStage> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateStageDetail(stageId),
  );
  return response.data;
};

const create = async (
  templateId: string | number,
  payload: CreateMixingActivityTemplateStagePayload,
): Promise<MixingActivityTemplateStageMutation> => {
  const response = await axiosClient.post(
    API_ROUTES.items.mixingActivityTemplateStages(templateId),
    payload,
  );
  return response.data;
};

const update = async (
  stageId: string | number,
  payload: UpdateMixingActivityTemplateStagePayload,
): Promise<MixingActivityTemplateStageMutation> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.mixingActivityTemplateStageDetail(stageId),
    payload,
  );
  return response.data;
};

const remove = async (
  stageId: string | number,
): Promise<MixingActivityTemplateStageMutation> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.mixingActivityTemplateStageDetail(stageId),
  );
  return response.data;
};

const duplicate = async (id: string | number): Promise<MixingActivityTemplateStageMutation> => {
  const response = await axiosClient.post(
    `${API_ROUTES.items.mixingActivityTemplateStageDetail(id)}/duplicate`,
  );
  return response.data;
};

const move = async (
  id: string | number,
  direction: "up" | "down",
): Promise<MixingActivityTemplateStageMutation> => {
  const response = await axiosClient.patch(
    `${API_ROUTES.items.mixingActivityTemplateStageDetail(id)}/move`,
    { direction },
  );
  return response.data;
};

const mixingActivityTemplateStagesService = {
  fetchByTemplateId,
  fetchById,
  create,
  update,
  delete: remove,
  duplicate,
  move,
};

export default mixingActivityTemplateStagesService;
