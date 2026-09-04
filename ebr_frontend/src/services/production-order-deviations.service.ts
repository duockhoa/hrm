import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

type Id = string | number;
type NullableId = Id | null;
type DeviationImageValue = string | File | Blob;
type DeviationImagesValue =
  | DeviationImageValue
  | DeviationImageValue[]
  | FileList
  | null;

export type ProductionOrderDeviationPayload = {
  production_order_id: Id;
  deviation_content: string;
  handling_plan?: string | null;
  handling_result?: string | null;
  cause?: string | null;
  cause_classification?: string | null;
  affected_quantity?: string | number | null;
  affected_quantity_unit?: string | null;
  handled_quantity?: string | number | null;
  handled_quantity_unit?: string | null;
  destroyed_quantity?: string | number | null;
  destroyed_quantity_unit?: string | null;
  approver_id?: NullableId;
  reporter_id: Id;
  deviation_images?: DeviationImagesValue;
  deviation_image?: DeviationImageValue | null;
};

export type UpdateProductionOrderDeviationPayload =
  Partial<ProductionOrderDeviationPayload>;

const isBlobValue = (value: unknown): value is File | Blob =>
  typeof Blob !== "undefined" && value instanceof Blob;

const normalizeImages = (
  value: DeviationImagesValue | undefined,
): DeviationImageValue[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof FileList !== "undefined" && value instanceof FileList) {
    return Array.from(value);
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value as DeviationImageValue];
};

const hasUploadFile = (
  payload: Partial<ProductionOrderDeviationPayload>,
) => {
  const images = [
    ...normalizeImages(payload.deviation_images),
    ...normalizeImages(payload.deviation_image),
  ];

  return images.some(isBlobValue);
};

const appendScalar = (
  formData: FormData,
  key: string,
  value: Id | NullableId | string | undefined,
) => {
  if (value === undefined || value === null) {
    return;
  }

  formData.append(key, String(value));
};

const buildDeviationFormData = (
  payload: Partial<ProductionOrderDeviationPayload>,
) => {
  const formData = new FormData();

  appendScalar(formData, "production_order_id", payload.production_order_id);
  appendScalar(formData, "deviation_content", payload.deviation_content);
  appendScalar(formData, "handling_plan", payload.handling_plan);
  appendScalar(formData, "handling_result", payload.handling_result ?? undefined);
  appendScalar(formData, "cause", payload.cause ?? undefined);
  appendScalar(
    formData,
    "cause_classification",
    payload.cause_classification ?? undefined,
  );
  appendScalar(
    formData,
    "affected_quantity",
    payload.affected_quantity === null ? undefined : payload.affected_quantity,
  );
  appendScalar(
    formData,
    "affected_quantity_unit",
    payload.affected_quantity_unit ?? undefined,
  );
  appendScalar(
    formData,
    "handled_quantity",
    payload.handled_quantity === null ? undefined : payload.handled_quantity,
  );
  appendScalar(
    formData,
    "handled_quantity_unit",
    payload.handled_quantity_unit ?? undefined,
  );
  appendScalar(
    formData,
    "destroyed_quantity",
    payload.destroyed_quantity === null
      ? undefined
      : payload.destroyed_quantity,
  );
  appendScalar(
    formData,
    "destroyed_quantity_unit",
    payload.destroyed_quantity_unit ?? undefined,
  );
  appendScalar(formData, "approver_id", payload.approver_id);
  appendScalar(formData, "reporter_id", payload.reporter_id);

  normalizeImages(payload.deviation_images).forEach((image) => {
    formData.append("deviation_images", image);
  });

  normalizeImages(payload.deviation_image).forEach((image) => {
    formData.append("deviation_image", image);
  });

  return formData;
};

const buildRequestData = (
  payload: Partial<ProductionOrderDeviationPayload>,
) => {
  if (!hasUploadFile(payload)) {
    return payload;
  }

  return buildDeviationFormData(payload);
};

const multipartConfig = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

const getRequestConfig = (
  payload: Partial<ProductionOrderDeviationPayload>,
) => (hasUploadFile(payload) ? multipartConfig : undefined);

const fetchProductionOrderDeviations = async (productionOrderId?: Id) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrderDeviations.base,
    {
      params:
        productionOrderId === undefined
          ? undefined
          : { production_order_id: productionOrderId },
    },
  );
  return response.data;
};

const fetchProductionOrderDeviationById = async (id: Id) => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionOrderDeviations.base}/${id}`,
  );
  return response.data;
};

const createProductionOrderDeviation = async (
  payload: ProductionOrderDeviationPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrderDeviations.base,
    buildRequestData(payload),
    getRequestConfig(payload),
  );
  return response.data;
};

const updateProductionOrderDeviation = async (
  id: Id,
  payload: UpdateProductionOrderDeviationPayload,
) => {
  const response = await axiosClient.put(
    `${API_ROUTES.productionOrderDeviations.base}/${id}`,
    buildRequestData(payload),
    getRequestConfig(payload),
  );
  return response.data;
};

const deleteProductionOrderDeviation = async (id: Id) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.productionOrderDeviations.base}/${id}`,
  );
  return response.data;
};

const fetchProductionOrderDeviationImage = async (filename: string) => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionOrderDeviations.images}/${filename}`,
    { responseType: "blob" },
  );
  return response.data;
};

const productionOrderDeviationsService = {
  fetchProductionOrderDeviations,
  fetchProductionOrderDeviationById,
  createProductionOrderDeviation,
  updateProductionOrderDeviation,
  deleteProductionOrderDeviation,
  fetchProductionOrderDeviationImage,
};

export default productionOrderDeviationsService;
