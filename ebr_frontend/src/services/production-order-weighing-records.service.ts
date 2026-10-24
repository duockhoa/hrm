import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import type {
  CreateProductionOrderWeighingRecordPayload,
  ProductionOrderWeighingRecord,
  ProductionOrderWeighingRecordLine,
  WeighingImportStage,
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
