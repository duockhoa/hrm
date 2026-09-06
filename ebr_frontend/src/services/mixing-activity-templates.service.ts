import type {
  CreateMixingActivityTemplatePayload,
  CopyMixingActivityTemplatePayload,
  MixingActivityTemplate,
  UpdateMixingActivityTemplatePayload,
} from "@/features/mixing-activity-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchAll = async (): Promise<MixingActivityTemplate[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.allMixingActivityTemplates,
  );
  return response.data;
};

const fetchByItemCode = async (
  itemCode: string,
): Promise<MixingActivityTemplate[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplates(itemCode),
  );
  return response.data;
};

const fetchById = async (
  templateId: string | number,
): Promise<MixingActivityTemplate> => {
  const response = await axiosClient.get(
    API_ROUTES.items.mixingActivityTemplateDetail(templateId),
  );
  return response.data;
};

const create = async (
  itemCode: string,
  payload: CreateMixingActivityTemplatePayload,
): Promise<MixingActivityTemplate> => {
  const response = await axiosClient.post(
    API_ROUTES.items.mixingActivityTemplates(itemCode),
    payload,
  );
  return response.data;
};

const copy = async (
  itemCode: string,
  payload: CopyMixingActivityTemplatePayload,
): Promise<MixingActivityTemplate> => {
  const response = await axiosClient.post(
    API_ROUTES.items.copyMixingActivityTemplate(itemCode),
    payload,
  );
  return response.data;
};

const update = async (
  templateId: string | number,
  payload: UpdateMixingActivityTemplatePayload,
): Promise<MixingActivityTemplate> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.mixingActivityTemplateDetail(templateId),
    payload,
  );
  return response.data;
};

const remove = async (
  templateId: string | number,
): Promise<MixingActivityTemplate> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.mixingActivityTemplateDetail(templateId),
  );
  return response.data;
};

const mixingActivityTemplatesService = {
  fetchAll,
  fetchByItemCode,
  fetchById,
  create,
  copy,
  update,
  delete: remove,
};

export default mixingActivityTemplatesService;
