import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import type {
  CreateProductionOrderWeighingRecordPayload,
  ProductionOrderWeighingRecord,
  ProductionOrderWeighingRecordLine,
  ProductionOrderWeighingRecordDetail,
  WeighingImportStage,
  UpdateWeighingRecordLinePayload,
  WeighingSourceMaterial,
  WeighingRecordLotCheck,
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
  async updateDescription(
    recordId: number,
    description: string | null,
    note?: string | null,
  ) {
    const response = await axiosClient.patch<ProductionOrderWeighingRecord>(
      API_ROUTES.productionOrders.weighingRecordDetail(recordId),
      { description, ...(note !== undefined ? { note } : {}) },
    );
    return response.data;
  },
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
  async checkLot(
    recordId: number,
    lineId: number,
    lotNo: string,
    isCorrect: boolean,
    images: File[] = [],
  ) {
    const url = `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/lot-check`;
    if (images.length) {
      const form = new FormData();
      form.append("lot_no", lotNo);
      form.append("is_correct", String(isCorrect));
      for (const image of images) form.append("images", image);
      const response = await axiosClient.patch<WeighingRecordLotCheck>(
        url,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    }
    const response = await axiosClient.patch<WeighingRecordLotCheck>(url, {
      lot_no: lotNo,
      is_correct: isCorrect,
    });
    return response.data;
  },
  async deleteLotCheckImage(recordId: number, lineId: number, imageId: number) {
    const response = await axiosClient.delete<WeighingRecordLotCheck>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/lot-check/images/${imageId}`,
    );
    return response.data;
  },
  async createWeighingDetail(
    recordId: number,
    lineId: number,
    netWeight: string,
    options?: { note?: string | null; images?: File[] },
  ) {
    const url = `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/details`;
    if (options?.images?.length) {
      const form = new FormData();
      form.append("net_weight", netWeight);
      if (options.note) form.append("note", options.note);
      for (const image of options.images) form.append("images", image);
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
  async updateWeighingDetail(
    recordId: number,
    lineId: number,
    detailId: number,
    payload: { net_weight?: string; note?: string | null },
  ) {
    const response =
      await axiosClient.patch<ProductionOrderWeighingRecordDetail>(
        `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/lines/${lineId}/details/${detailId}`,
        payload,
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
  async fetchSourceMaterials(recordId: number) {
    const response = await axiosClient.get<WeighingSourceMaterial[]>(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/source-materials`,
    );
    return response.data;
  },
  async importLines(recordId: number, lineNumbers: number[]) {
    const response = await axiosClient.post<
      ProductionOrderWeighingRecordLine[]
    >(
      `${API_ROUTES.productionOrders.weighingRecordDetail(recordId)}/import-lines`,
      { line_numbers: lineNumbers },
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
