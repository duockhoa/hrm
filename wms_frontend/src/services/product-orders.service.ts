import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";

type UpdateFinishedProductSummaryPayload = {
  package_count?: number;
  boxes_per_package?: number;
  loose_box_count?: number;
  note?: string | null;
};

const fetchFinishedProductSummaries = async () => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProductSummaries,
  );
  return response.data;
};

const fetchFinishedProductSummaryById = async (summaryId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(summaryId),
  );
  return response.data;
};

const updateFinishedProductSummary = async (
  summaryId: string | number,
  payload: UpdateFinishedProductSummaryPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(summaryId),
    payload,
  );
  return response.data;
};

const deleteFinishedProductSummary = async (summaryId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(summaryId),
  );
  return response.data;
};

const createSamplingRequest = async (
  id: string | number,
  payload: { location: string },
) => {
  const response = await axiosClient.post(
    `${API_ROUTES.productionOrders.base}/${id}/sampling-requests`,
    payload,
  );
  return response.data;
};

const productOrdersService = {
  fetchFinishedProductSummaries,
  fetchFinishedProductSummaryById,
  updateFinishedProductSummary,
  deleteFinishedProductSummary,
  createSamplingRequest,
};

export default productOrdersService;
