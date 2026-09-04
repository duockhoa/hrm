import type {
  CleaningObject,
  CleaningObjectWithRequirements,
  CleaningRequirement,
  CreateCleaningObjectPayload,
  CreateCleaningRequirementPayload,
  UpdateCleaningObjectPayload,
  UpdateCleaningRequirementPayload,
} from "@/features/cleaning-requirements/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchCleaningObjects = async (): Promise<CleaningObject[]> => {
  const response = await axiosClient.get(API_ROUTES.cleaningObjects.base);
  return response.data;
};

const fetchCleaningObjectById = async (
  id: string | number,
): Promise<CleaningObjectWithRequirements> => {
  const response = await axiosClient.get(
    API_ROUTES.cleaningObjects.detail(id),
  );
  return response.data;
};

const fetchCleaningObjectByQrCode = async (
  qrCode: string,
): Promise<CleaningObjectWithRequirements> => {
  const response = await axiosClient.get(
    API_ROUTES.cleaningObjects.byQrCode(qrCode),
  );
  return response.data;
};

const createCleaningObject = async (
  payload: CreateCleaningObjectPayload,
): Promise<CleaningObject> => {
  const response = await axiosClient.post(
    API_ROUTES.cleaningObjects.base,
    payload,
  );
  return response.data;
};

const updateCleaningObject = async (
  id: string | number,
  payload: UpdateCleaningObjectPayload,
): Promise<CleaningObject> => {
  const response = await axiosClient.patch(
    API_ROUTES.cleaningObjects.detail(id),
    payload,
  );
  return response.data;
};

const deleteCleaningObject = async (
  id: string | number,
): Promise<CleaningObject> => {
  const response = await axiosClient.delete(
    API_ROUTES.cleaningObjects.detail(id),
  );
  return response.data;
};

const fetchCleaningRequirements = async (): Promise<
  CleaningRequirement[]
> => {
  const response = await axiosClient.get(API_ROUTES.cleaningRequirements.base);
  return response.data;
};

const fetchCleaningRequirementById = async (
  id: string | number,
): Promise<CleaningRequirement> => {
  const response = await axiosClient.get(
    API_ROUTES.cleaningRequirements.detail(id),
  );
  return response.data;
};

const createCleaningRequirement = async (
  payload: CreateCleaningRequirementPayload,
): Promise<CleaningRequirement> => {
  const response = await axiosClient.post(
    API_ROUTES.cleaningRequirements.base,
    payload,
  );
  return response.data;
};

const updateCleaningRequirement = async (
  id: string | number,
  payload: UpdateCleaningRequirementPayload,
): Promise<CleaningRequirement> => {
  const response = await axiosClient.patch(
    API_ROUTES.cleaningRequirements.detail(id),
    payload,
  );
  return response.data;
};

const deleteCleaningRequirement = async (
  id: string | number,
): Promise<CleaningRequirement> => {
  const response = await axiosClient.delete(
    API_ROUTES.cleaningRequirements.detail(id),
  );
  return response.data;
};

const fetchCleaningObjectsWithRequirements = async (): Promise<
  CleaningObjectWithRequirements[]
> => {
  const [objects, requirements] = await Promise.all([
    fetchCleaningObjects(),
    fetchCleaningRequirements(),
  ]);

  const requirementsByObject = new Map<number, CleaningRequirement[]>();
  requirements.forEach((requirement) => {
    const current =
      requirementsByObject.get(requirement.cleaning_object_id) ?? [];
    current.push(requirement);
    requirementsByObject.set(requirement.cleaning_object_id, current);
  });

  return objects.map((object) => ({
    ...object,
    cleaningRequirements: requirementsByObject.get(object.id) ?? [],
  }));
};

const cleaningRequirementsService = {
  fetchCleaningObjects,
  fetchCleaningObjectById,
  fetchCleaningObjectByQrCode,
  createCleaningObject,
  updateCleaningObject,
  deleteCleaningObject,
  fetchCleaningRequirements,
  fetchCleaningRequirementById,
  createCleaningRequirement,
  updateCleaningRequirement,
  deleteCleaningRequirement,
  fetchCleaningObjectsWithRequirements,
};

export default cleaningRequirementsService;
