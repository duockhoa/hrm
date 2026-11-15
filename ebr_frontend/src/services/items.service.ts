import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateItemEquipmentPayload,
  ItemEquipment,
} from "@/features/item-equipment/types";

export type UpdateItemPayload = {
  registration_id?: number | null;
};

export type ItemCatalogEntry = {
  item_code: string;
  item_name: string | null;
  dk_code: string | null;
  unit: string | null;
};

export const ITEM_CATALOG_PAGE_SIZE = 300;

export type ItemCatalogPage = {
  items: ItemCatalogEntry[];
  total: number | null;
  skip: number;
};

const fetchCatalogPage = async (
  url: string,
  search: string,
  skip: number,
): Promise<ItemCatalogPage> => {
  const response = await axiosClient.get<ItemCatalogEntry[]>(url, {
    params: {
      search: search.trim() || undefined,
      skip,
      top: ITEM_CATALOG_PAGE_SIZE,
      count: true,
      orderBy: "item_code:desc",
      select: "item_code,item_name,dk_code,unit",
      expand: "none",
    },
  });
  const count = response.headers["x-total-count"];
  const total = count !== undefined && count !== "" ? Number(count) : NaN;
  return {
    items: response.data,
    total: Number.isSafeInteger(total) && total >= 0 ? total : null,
    skip,
  };
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

const fetchFinishedProducts = async (search = "") => {
  const response = await axiosClient.get<ItemCatalogEntry[]>(
    API_ROUTES.items.finishedProducts,
    { params: { search: search.trim() || undefined } },
  );
  return response.data;
};

const fetchSemiFinishedProducts = async (search = "") => {
  const response = await axiosClient.get<ItemCatalogEntry[]>(
    API_ROUTES.items.semiFinishedProducts,
    { params: { search: search.trim() || undefined } },
  );
  return response.data;
};

const fetchRawMaterials = async (search = "") => {
  const response = await axiosClient.get<ItemCatalogEntry[]>(
    API_ROUTES.items.rawMaterials,
    { params: { search: search.trim() || undefined } },
  );
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
  fetchCatalogPage,
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
