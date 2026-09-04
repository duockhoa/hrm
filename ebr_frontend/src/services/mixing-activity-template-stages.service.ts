import type {
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
): Promise<MixingActivityTemplateStage> => {
  const response = await axiosClient.post(
    API_ROUTES.items.mixingActivityTemplateStages(templateId),
    payload,
  );
  return response.data;
};

const update = async (
  stageId: string | number,
  payload: UpdateMixingActivityTemplateStagePayload,
): Promise<MixingActivityTemplateStage> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.mixingActivityTemplateStageDetail(stageId),
    payload,
  );
  return response.data;
};

const remove = async (
  stageId: string | number,
): Promise<MixingActivityTemplateStage> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.mixingActivityTemplateStageDetail(stageId),
  );
  return response.data;
};

const mixingActivityTemplateStagesService = {
  fetchByTemplateId,
  fetchById,
  create,
  update,
  delete: remove,
};

export default mixingActivityTemplateStagesService;
