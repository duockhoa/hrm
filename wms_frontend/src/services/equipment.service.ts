import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateEquipmentParameterPayload,
  CreateEquipmentPayload,
  Equipment,
  EquipmentParameter,
  UpdateEquipmentParameterPayload,
  UpdateEquipmentPayload,
} from "@/features/equipment/types";

const fetchEquipment = async (): Promise<Equipment[]> => {
  const response = await axiosClient.get(API_ROUTES.equipment.base);
  return response.data;
};

const fetchEquipmentById = async (
  id: string | number,
): Promise<Equipment> => {
  const response = await axiosClient.get(API_ROUTES.equipment.detail(id));
  return response.data;
};

const createEquipment = async (
  payload: CreateEquipmentPayload,
): Promise<Equipment> => {
  const response = await axiosClient.post(API_ROUTES.equipment.base, payload);
  return response.data;
};

const updateEquipment = async (
  id: string | number,
  payload: UpdateEquipmentPayload,
): Promise<Equipment> => {
  const response = await axiosClient.patch(
    API_ROUTES.equipment.detail(id),
    payload,
  );
  return response.data;
};

const deleteEquipment = async (id: string | number): Promise<Equipment> => {
  const response = await axiosClient.delete(API_ROUTES.equipment.detail(id));
  return response.data;
};

const fetchEquipmentParameters = async (
  equipmentId: string | number,
): Promise<EquipmentParameter[]> => {
  const response = await axiosClient.get(
    API_ROUTES.equipment.parameters(equipmentId),
  );
  return response.data;
};

const fetchEquipmentParameterById = async (
  parameterId: string | number,
): Promise<EquipmentParameter> => {
  const response = await axiosClient.get(
    API_ROUTES.equipment.parameterDetail(parameterId),
  );
  return response.data;
};

const createEquipmentParameter = async (
  equipmentId: string | number,
  payload: CreateEquipmentParameterPayload,
): Promise<EquipmentParameter> => {
  const response = await axiosClient.post(
    API_ROUTES.equipment.parameters(equipmentId),
    payload,
  );
  return response.data;
};

const updateEquipmentParameter = async (
  parameterId: string | number,
  payload: UpdateEquipmentParameterPayload,
): Promise<EquipmentParameter> => {
  const response = await axiosClient.patch(
    API_ROUTES.equipment.parameterDetail(parameterId),
    payload,
  );
  return response.data;
};

const deleteEquipmentParameter = async (
  parameterId: string | number,
): Promise<EquipmentParameter> => {
  const response = await axiosClient.delete(
    API_ROUTES.equipment.parameterDetail(parameterId),
  );
  return response.data;
};

const equipmentService = {
  fetchEquipment,
  fetchEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  fetchEquipmentParameters,
  fetchEquipmentParameterById,
  createEquipmentParameter,
  updateEquipmentParameter,
  deleteEquipmentParameter,
};

export default equipmentService;
