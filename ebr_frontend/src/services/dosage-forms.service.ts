import type {
  DosageForm,
  DosageFormPayload,
  UpdateDosageFormPayload,
} from "@/features/dosage-forms";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchAll = async (): Promise<DosageForm[]> => {
  const response = await axiosClient.get(API_ROUTES.dosageForms.base);
  return response.data;
};

const fetchById = async (id: string | number): Promise<DosageForm> => {
  const response = await axiosClient.get(API_ROUTES.dosageForms.detail(id));
  return response.data;
};

const create = async (payload: DosageFormPayload): Promise<DosageForm> => {
  const response = await axiosClient.post(API_ROUTES.dosageForms.base, payload);
  return response.data;
};

const update = async (
  id: string | number,
  payload: UpdateDosageFormPayload,
): Promise<DosageForm> => {
  const response = await axiosClient.patch(
    API_ROUTES.dosageForms.detail(id),
    payload,
  );
  return response.data;
};

const remove = async (id: string | number): Promise<DosageForm> => {
  const response = await axiosClient.delete(API_ROUTES.dosageForms.detail(id));
  return response.data;
};

const dosageFormsService = {
  fetchAll,
  fetchById,
  create,
  update,
  delete: remove,
};

export default dosageFormsService;
