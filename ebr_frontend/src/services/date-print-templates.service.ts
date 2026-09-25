import type {
  CreateDatePrintTemplatePayload,
  DatePrintTemplate,
  UpdateDatePrintTemplatePayload,
} from "@/features/date-print-templates/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchAll = async (): Promise<DatePrintTemplate[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.allDatePrintTemplates,
  );
  return response.data;
};

const fetchByItemCode = async (
  itemCode: string,
): Promise<DatePrintTemplate[]> => {
  const response = await axiosClient.get(
    API_ROUTES.items.datePrintTemplates(itemCode),
  );
  return response.data;
};

const fetchById = async (
  templateId: string | number,
): Promise<DatePrintTemplate> => {
  const response = await axiosClient.get(
    API_ROUTES.items.datePrintTemplateDetail(templateId),
  );
  return response.data;
};

const create = async (
  itemCode: string,
  payload: CreateDatePrintTemplatePayload,
): Promise<DatePrintTemplate> => {
  const response = await axiosClient.post(
    API_ROUTES.items.datePrintTemplates(itemCode),
    payload,
  );
  return response.data;
};

const update = async (
  templateId: string | number,
  payload: UpdateDatePrintTemplatePayload,
): Promise<DatePrintTemplate> => {
  const response = await axiosClient.patch(
    API_ROUTES.items.datePrintTemplateDetail(templateId),
    payload,
  );
  return response.data;
};

const uploadImage = async (
  templateId: string | number,
  image: File,
): Promise<DatePrintTemplate> => {
  const formData = new FormData();
  formData.append("image", image);
  const response = await axiosClient.post(
    API_ROUTES.items.datePrintTemplateImage(templateId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteImage = async (
  templateId: string | number,
): Promise<DatePrintTemplate> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.datePrintTemplateImage(templateId),
  );
  return response.data;
};

const remove = async (
  templateId: string | number,
): Promise<DatePrintTemplate> => {
  const response = await axiosClient.delete(
    API_ROUTES.items.datePrintTemplateDetail(templateId),
  );
  return response.data;
};

const datePrintTemplatesService = {
  fetchAll,
  fetchByItemCode,
  fetchById,
  create,
  update,
  uploadImage,
  deleteImage,
  delete: remove,
};

export default datePrintTemplatesService;
