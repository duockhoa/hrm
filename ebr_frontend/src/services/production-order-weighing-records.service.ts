import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import type {
  CreateProductionOrderWeighingRecordPayload,
  ProductionOrderWeighingRecord,
  ProductionOrderWeighingRecordLine,
  ProductionOrderWeighingRecordDetail,
  WeighingImportStage,
  UpdateWeighingRecordLinePayload,
} from "@/features/production-order-weighing-records/types";

const fetchAllByProductionOrderId = async (
  productionOrderId: string | number,
) => {
  const response = await axiosClient.get<ProductionOrderWeighingRecord[]>(
    API_ROUTES.productionOrders.weighingRecords(productionOrderId),
  );
  return response.data;
};

const create = async (
  productionOrderId: string | number,
  payload: CreateProductionOrderWeighingRecordPayload,
) => {
  const response = await axiosClient.post<ProductionOrderWeighingRecord>(
    API_ROUTES.productionOrders.weighingRecords(productionOrderId),
    payload,
  );
  return response.data;
};

const productionOrderWeighingRecordsService = {
  fetchAllByProductionOrderId,
  create,
  async delete(recordId: string | number) {
    const response = await axiosClient.delete<ProductionOrderWeighingRecord>(
      API_ROUTES.productionOrders.weighingRecordDetail(recordId),
    );
    return response.data;
  },
  async fetchById(recordId: string | number) {
    const response = await axiosClient.get<ProductionOrderWeighingRecord>(
      API_ROUTES.productionOrders.weighingRecordDetail(recordId),
    );
    return response.data;
  },
  async complete(recordId: string | number) {
    const response = await axiosClient.patch<ProductionOrderWeighingRecord>(
      API_ROUTES.productionOrders.weighingRecordDetail(recordId),
      { status: "completed" },
    );
    return response.data;
  },
  async approveByQaStaff(recordId: string | number) {
    const response = await axiosClient.patch<ProductionOrderWeighingRecord>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/qa-staff-approval`,
    );
    return response.data;
  },
  async approveByIpcStaff(recordId: string | number) {
    const response = await axiosClient.patch<ProductionOrderWeighingRecord>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/ipc-staff-approval`,
    );
    return response.data;
  },
  async fetchLines(recordId: string | number) {
    const response = await axiosClient.get<ProductionOrderWeighingRecordLine[]>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines`,
    );
    return response.data;
  },
  async updateLine(
    recordId: number,
    lineId: number,
    payload: UpdateWeighingRecordLinePayload,
  ) {
    const response = await axiosClient.patch<ProductionOrderWeighingRecordLine>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}`,
      payload,
    );
    return response.data;
  },
  async deleteLine(recordId: number, lineId: number) {
    const response =
      await axiosClient.delete<ProductionOrderWeighingRecordLine>(
        `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}`,
      );
    return response.data;
  },
  async createWeighingDetail(
    recordId: number,
    lineId: number,
    netWeight: string,
    options?: { note?: string | null; image?: File },
  ) {
    const url = `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/details`;
    if (options?.image) {
      const form = new FormData();
      form.append("net_weight", netWeight);
      if (options.note) form.append("note", options.note);
      form.append("image", options.image);
      const response =
        await axiosClient.post<ProductionOrderWeighingRecordDetail>(url, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      return response.data;
    }
    const response =
      await axiosClient.post<ProductionOrderWeighingRecordDetail>(
        `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/details`,
        { net_weight: netWeight, note: options?.note ?? null },
      );
    return response.data;
  },
  async fetchWeighingDetails(recordId: number, lineId: number) {
    const response = await axiosClient.get<
      ProductionOrderWeighingRecordDetail[]
    >(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/details`,
    );
    return response.data;
  },
  async fetchStages(recordId: string | number) {
    const response = await axiosClient.get<WeighingImportStage[]>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/stages`,
    );
    return response.data;
  },
  async importStage(recordId: string | number, stageId: number) {
    const response = await axiosClient.post<
      ProductionOrderWeighingRecordLine[]
    >(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/import-stage`,
      { stage_id: stageId },
    );
    return response.data;
  },
};
export default productionOrderWeighingRecordsService;
