import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateItemEquipmentPayload,
  ItemEquipment,
} from "@/features/item-equipment/types";

export type UpdateItemPayload = {
  registration_id?: number | null;
};

const fetchItems = async () => {
  const response = await axiosClient.get(API_ROUTES.items.base);
  return response.data;
};

const fetchItemsByCodePrefix = async (codePrefix: string) => {
  const response = await axiosClient.get(API_ROUTES.items.base, {
    params: { codePrefix },
  });
  return response.data;
};

const fetchFinishedProducts = async () => {
  const response = await axiosClient.get(API_ROUTES.items.finishedProducts);
  return response.data;
};

const fetchSemiFinishedProducts = async () => {
  const response = await axiosClient.get(API_ROUTES.items.semiFinishedProducts);
  return response.data;
};

const fetchRawMaterials = async () => {
  const response = await axiosClient.get(API_ROUTES.items.rawMaterials);
  return response.data;
};

const fetchItemById = async (id: string) => {
  const response = await axiosClient.get(`${API_ROUTES.items.base}/${id}`);
  return response.data;
};

const updateItem = async (itemCode: string, payload: UpdateItemPayload) => {
  const response = await axiosClient.patch(
    `${API_ROUTES.items.base}/${encodeURIComponent(itemCode)}`,
    payload,
  );
  return response.data;
};

const fetchItemEquipment = async (
  itemCode: string,
): Promise<ItemEquipment[]> => {
  const response = await axiosClient.get(API_ROUTES.items.equipment(itemCode));
  return response.data;
};

const fetchItemEquipmentById = async (
  itemEquipmentId: string | number,
): Promise<ItemEquipment> => {
  const response = await axiosClient.get(
    API_ROUTES.items.equipmentDetail(itemEquipmentId),
  );
  return response.data;
};

const createItemEquipment = async (
  itemCode: string,
  payload: CreateItemEquipmentPayload,
): Promise<ItemEquipment> => {
  const response = await axiosClient.post(
    API_ROUTES.items.equipment(itemCode),
    payload,
  );
  return response.data;
};

const deleteItemEquipment = async (
  itemEquipmentId: string | number,
): Promise<ItemEquipment> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.equipmentDetail(itemEquipmentId),
  );
  return response.data;
};

const copyItemEquipment = async (
  itemCode: string,
  sourceItemCode: string,
): Promise<ItemEquipment[]> => {
  const response = await axiosClient.post(
    API_ROUTES.items.equipmentCopy(itemCode),
    { source_item_code: sourceItemCode },
  );
  return response.data;
};

const itemsService = {
  fetchItems,
  fetchItemsByCodePrefix,
  fetchFinishedProducts,
  fetchSemiFinishedProducts,
  fetchRawMaterials,
  fetchItemById,
  updateItem,
  fetchItemEquipment,
  fetchItemEquipmentById,
  createItemEquipment,
  deleteItemEquipment,
  copyItemEquipment,
};

export default itemsService;
