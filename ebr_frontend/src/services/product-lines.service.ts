import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import type {
  CreateProductLinePayload,
  ProductLine,
  UpdateProductLinePayload,
} from "@/features/product-lines/types";

const fetchProductLines = async (): Promise<ProductLine[]> => {
  const response = await axiosClient.get(API_ROUTES.productLines.base);
  return response.data;
};

const fetchProductLineById = async (
  id: string | number,
): Promise<ProductLine> => {
  const response = await axiosClient.get(`${API_ROUTES.productLines.base}/${id}`);
  return response.data;
};

const fetchProductLineByCode = async (code: string): Promise<ProductLine> => {
  const response = await axiosClient.get(API_ROUTES.productLines.byCode(code));
  return response.data;
};

const createProductLine = async (
  payload: CreateProductLinePayload,
): Promise<ProductLine> => {
  const response = await axiosClient.post(API_ROUTES.productLines.base, payload);
  return response.data;
};

const updateProductLine = async (
  id: string | number,
  payload: UpdateProductLinePayload,
): Promise<ProductLine> => {
  const response = await axiosClient.put(
    `${API_ROUTES.productLines.base}/${id}`,
    payload,
  );
  return response.data;
};

const deleteProductLine = async (id: string | number) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.productLines.base}/${id}`,
  );
  return response.data;
};

export default {
  fetchProductLines,
  fetchProductLineById,
  fetchProductLineByCode,
  createProductLine,
  updateProductLine,
  deleteProductLine,
};
