import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateFeaturePayload,
  Feature,
  ItemFeatureConfig,
  UpdateItemFeaturePayload,
  UpdateFeaturePayload,
  UpsertItemFeaturePayload,
} from "@/features/features/types";

const fetchFeatures = async (): Promise<Feature[]> => {
  const response = await axiosClient.get(API_ROUTES.features.base);
  return response.data;
};

const fetchFeatureById = async (id: string | number): Promise<Feature> => {
  const response = await axiosClient.get(`${API_ROUTES.features.base}/${id}`);
  return response.data;
};

const fetchFeatureByKey = async (key: string): Promise<Feature> => {
  const response = await axiosClient.get(API_ROUTES.features.byKey(key));
  return response.data;
};

const createFeature = async (
  payload: CreateFeaturePayload,
): Promise<Feature> => {
  const response = await axiosClient.post(API_ROUTES.features.base, payload);
  return response.data;
};

const updateFeature = async (
  id: string | number,
  payload: UpdateFeaturePayload,
): Promise<Feature> => {
  const response = await axiosClient.put(
    `${API_ROUTES.features.base}/${id}`,
    payload,
  );
  return response.data;
};

const deleteFeature = async (id: string | number) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.features.base}/${id}`,
  );
  return response.data;
};

const fetchItemFeatureConfig = async (
  itemCode: string,
  includeDisabled = true,
): Promise<ItemFeatureConfig> => {
  const response = await axiosClient.get(
    API_ROUTES.features.itemConfig(itemCode),
    {
      params: { includeDisabled },
    },
  );
  return response.data;
};

const upsertItemFeature = async (
  itemCode: string,
  payload: UpsertItemFeaturePayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.features.item(itemCode),
    payload,
  );
  return response.data;
};

const updateItemFeature = async (
  itemCode: string,
  featureId: string | number,
  payload: UpdateItemFeaturePayload,
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.features.item(itemCode)}/${featureId}`,
    payload,
  );
  return response.data;
};

const copyItemFeatureConfig = async (
  itemCode: string,
  sourceItemCode: string,
): Promise<ItemFeatureConfig> => {
  const response = await axiosClient.post(
    API_ROUTES.features.copyItemConfig(itemCode),
    { source_item_code: sourceItemCode },
  );
  return response.data;
};

const featuresService = {
  fetchFeatures,
  fetchFeatureById,
  fetchFeatureByKey,
  createFeature,
  updateFeature,
  deleteFeature,
  fetchItemFeatureConfig,
  upsertItemFeature,
  updateItemFeature,
  copyItemFeatureConfig,
};

export default featuresService;
