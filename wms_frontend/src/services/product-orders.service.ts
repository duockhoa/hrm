import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";

export type SapProductionReceipt = {
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  Comments: string | null;
  JournalMemo: string | null;
  Reference2: string | null;
  DocumentLines: {
    LineNum: number;
    ItemCode: string;
    ItemDescription: string | null;
    Quantity: number;
    Price: number | null;
    WarehouseCode: string | null;
    MeasureUnit: string | null;
    Currency: string | null;
    CostingCode: string | null;
    CostingCode2: string | null;
    U_SL: string | null;
    U_HSD: string | null;
    U_NSX: string | null;
  }[];
};

export type SapProductionReceiptInput = {
  requestId: string;
  postingDate: string;
  quantity: number;
  warehouseCode: string;
  lotNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  departmentCode?: string;
  costItemCode?: string;
  comments: string;
};

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
  createSapProductionReceipt: async (
    summaryId: string | number,
    payload: SapProductionReceiptInput,
  ) => {
    const { data } = await axiosClient.post<
      Pick<SapProductionReceipt, "DocEntry" | "DocNum">
    >(
      API_ROUTES.productionOrders.finishedProductSummarySapReceipts(summaryId),
      payload,
    );
    return data;
  },
  fetchSapProductionReceipts: async (summaryId: string | number) => {
    const { data } = await axiosClient.get<SapProductionReceipt[]>(
      API_ROUTES.productionOrders.finishedProductSummarySapReceipts(summaryId),
    );
    return data;
  },
  confirmFinishedProductSummaryWarehouse: async (
    summaryId: string | number,
  ) => {
    const response = await axiosClient.post(
      `${API_ROUTES.productionOrders.finishedProductSummaryDetail(summaryId)}/warehouse-confirmation`,
    );
    return response.data;
  },
  fetchFinishedProductSummaries,
  fetchFinishedProductSummaryById,
  updateFinishedProductSummary,
  deleteFinishedProductSummary,
  createSamplingRequest,
};

export default productOrdersService;
