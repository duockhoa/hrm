import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";
import type {
  CreateProductionOrderWeighingRecordPayload,
  ProductionOrderWeighingRecord,
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
};
export default productionOrderWeighingRecordsService;
