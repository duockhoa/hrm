import type {
  SecondaryPackagingStageRequirement,
  SecondaryPackagingStageRequirementPayload,
} from "@/features/secondary-packaging-stage-requirements";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchAll = async (): Promise<SecondaryPackagingStageRequirement[]> => {
  const response = await axiosClient.get(
    API_ROUTES.secondaryPackagingStageRequirements.base,
  );
  return response.data;
};

const fetchById = async (
  id: string | number,
): Promise<SecondaryPackagingStageRequirement> => {
  const response = await axiosClient.get(
    API_ROUTES.secondaryPackagingStageRequirements.detail(id),
  );
  return response.data;
};

const create = async (
  payload: SecondaryPackagingStageRequirementPayload,
): Promise<SecondaryPackagingStageRequirement> => {
  const response = await axiosClient.post(
    API_ROUTES.secondaryPackagingStageRequirements.base,
    payload,
  );
  return response.data;
};

const update = async (
  id: string | number,
  payload: Partial<SecondaryPackagingStageRequirementPayload>,
): Promise<SecondaryPackagingStageRequirement> => {
  const response = await axiosClient.patch(
    API_ROUTES.secondaryPackagingStageRequirements.detail(id),
    payload,
  );
  return response.data;
};

const remove = async (
  id: string | number,
): Promise<SecondaryPackagingStageRequirement> => {
  const response = await axiosClient.delete(
    API_ROUTES.secondaryPackagingStageRequirements.detail(id),
  );
  return response.data;
};

const secondaryPackagingStageRequirementsService = {
  fetchAll,
  fetchById,
  create,
  update,
  delete: remove,
};

export default secondaryPackagingStageRequirementsService;
