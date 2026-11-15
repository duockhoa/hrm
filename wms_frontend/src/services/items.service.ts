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

const replaceItemEquipment = async (
  itemCode: string,
  currentEntries: ItemEquipment[],
  sourceEntries: ItemEquipment[],
) => {
  const sourceEquipmentIds = new Set(
    sourceEntries.map((entry) => entry.equipment_id),
  );
  const currentEquipmentIds = new Set(
    currentEntries.map((entry) => entry.equipment_id),
  );
  const operations: Array<() => Promise<ItemEquipment>> = [
    ...currentEntries
      .filter((entry) => !sourceEquipmentIds.has(entry.equipment_id))
      .map((entry) => () => deleteItemEquipment(entry.id)),
    ...Array.from(sourceEquipmentIds)
      .filter((equipmentId) => !currentEquipmentIds.has(equipmentId))
      .map(
        (equipmentId) => () =>
          createItemEquipment(itemCode, { equipment_id: equipmentId }),
      ),
  ];
  const batchSize = 8;
  const failures: unknown[] = [];

  for (let index = 0; index < operations.length; index += batchSize) {
    const results = await Promise.allSettled(
      operations
        .slice(index, index + batchSize)
        .map((operation) => operation()),
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        failures.push(result.reason);
      }
    });
  }

  if (failures.length > 0) {
    throw new Error(
      `Không thể thực hiện ${failures.length}/${operations.length} thay đổi thiết bị.`,
    );
  }
};

const itemsService = {
  fetchCatalogPage,
  fetchItems,
  fetchFinishedProducts,
  fetchSemiFinishedProducts,
  fetchRawMaterials,
  fetchItemById,
  updateItem,
  fetchItemEquipment,
  fetchItemEquipmentById,
  createItemEquipment,
  deleteItemEquipment,
  replaceItemEquipment,
};

export default itemsService;
