import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateProductionWorkshopPayload,
  ProductionWorkshop,
  UpdateProductionWorkshopPayload,
} from "@/features/production-workshops/types";
import type {
  CreateProductionWorkshopPressureDifferentialPayload,
  ProductionWorkshopPressureDifferential,
  UpdateProductionWorkshopPressureDifferentialPayload,
} from "@/features/production-workshop-pressure-differentials/types";
import type {
  CreateProductionWorkshopCleaningChecklistPayload,
  ProductionWorkshopCleaningChecklist,
  UpdateProductionWorkshopCleaningChecklistPayload,
} from "@/features/production-workshop-cleaning-checklists/types";

const fetchProductionWorkshops = async (): Promise<ProductionWorkshop[]> => {
  const response = await axiosClient.get(API_ROUTES.productionWorkshops.base);
  return response.data;
};

const fetchProductionWorkshopById = async (
  id: string | number,
): Promise<ProductionWorkshop> => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionWorkshops.base}/${id}`,
  );
  return response.data;
};

const createProductionWorkshop = async (
  payload: CreateProductionWorkshopPayload,
): Promise<ProductionWorkshop> => {
  const response = await axiosClient.post(
    API_ROUTES.productionWorkshops.base,
    payload,
  );
  return response.data;
};

const updateProductionWorkshop = async (
  id: string | number,
  payload: UpdateProductionWorkshopPayload,
): Promise<ProductionWorkshop> => {
  const response = await axiosClient.put(
    `${API_ROUTES.productionWorkshops.base}/${id}`,
    payload,
  );
  return response.data;
};

const deleteProductionWorkshop = async (id: string | number) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.productionWorkshops.base}/${id}`,
  );
  return response.data;
};

const fetchPressureDifferentials = async (
  workshopId: string | number,
): Promise<ProductionWorkshopPressureDifferential[]> => {
  const response = await axiosClient.get(
    API_ROUTES.productionWorkshops.pressureDifferentials(workshopId),
  );
  return response.data;
};

const fetchPressureDifferentialById = async (
  pressureDifferentialId: string | number,
): Promise<ProductionWorkshopPressureDifferential> => {
  const response = await axiosClient.get(
    API_ROUTES.productionWorkshops.pressureDifferentialDetail(
      pressureDifferentialId,
    ),
  );
  return response.data;
};

const createPressureDifferential = async (
  workshopId: string | number,
  payload: CreateProductionWorkshopPressureDifferentialPayload,
): Promise<ProductionWorkshopPressureDifferential> => {
  const response = await axiosClient.post(
    API_ROUTES.productionWorkshops.pressureDifferentials(workshopId),
    payload,
  );
  return response.data;
};

const updatePressureDifferential = async (
  pressureDifferentialId: string | number,
  payload: UpdateProductionWorkshopPressureDifferentialPayload,
): Promise<ProductionWorkshopPressureDifferential> => {
  const response = await axiosClient.put(
    API_ROUTES.productionWorkshops.pressureDifferentialDetail(
      pressureDifferentialId,
    ),
    payload,
  );
  return response.data;
};

const deletePressureDifferential = async (
  pressureDifferentialId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionWorkshops.pressureDifferentialDetail(
      pressureDifferentialId,
    ),
  );
  return response.data;
};

const fetchCleaningChecklists = async (
  workshopId: string | number,
): Promise<ProductionWorkshopCleaningChecklist[]> => {
  const response = await axiosClient.get(
    API_ROUTES.productionWorkshops.cleaningChecklists(workshopId),
  );
  return response.data;
};

const fetchCleaningChecklistById = async (
  cleaningChecklistId: string | number,
): Promise<ProductionWorkshopCleaningChecklist> => {
  const response = await axiosClient.get(
    API_ROUTES.productionWorkshops.cleaningChecklistDetail(cleaningChecklistId),
  );
  return response.data;
};

const createCleaningChecklist = async (
  workshopId: string | number,
  payload: CreateProductionWorkshopCleaningChecklistPayload,
): Promise<ProductionWorkshopCleaningChecklist> => {
  const response = await axiosClient.post(
    API_ROUTES.productionWorkshops.cleaningChecklists(workshopId),
    payload,
  );
  return response.data;
};

const updateCleaningChecklist = async (
  cleaningChecklistId: string | number,
  payload: UpdateProductionWorkshopCleaningChecklistPayload,
): Promise<ProductionWorkshopCleaningChecklist> => {
  const response = await axiosClient.put(
    API_ROUTES.productionWorkshops.cleaningChecklistDetail(cleaningChecklistId),
    payload,
  );
  return response.data;
};

const deleteCleaningChecklist = async (
  cleaningChecklistId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionWorkshops.cleaningChecklistDetail(cleaningChecklistId),
  );
  return response.data;
};

export default {
  fetchProductionWorkshops,
  fetchProductionWorkshopById,
  createProductionWorkshop,
  updateProductionWorkshop,
  deleteProductionWorkshop,
  fetchPressureDifferentials,
  fetchPressureDifferentialById,
  createPressureDifferential,
  updatePressureDifferential,
  deletePressureDifferential,
  fetchCleaningChecklists,
  fetchCleaningChecklistById,
  createCleaningChecklist,
  updateCleaningChecklist,
  deleteCleaningChecklist,
};
