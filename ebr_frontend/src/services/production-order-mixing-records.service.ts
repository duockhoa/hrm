import type {
  CreateMixingActivityTemplateStagePayload,
  CreateMixingActivityTemplateStageStepParameterPayload,
  CreateMixingActivityTemplateStageStepPayload,
  UpdateMixingActivityTemplateStagePayload,
  UpdateMixingActivityTemplateStageStepParameterPayload,
  UpdateMixingActivityTemplateStageStepPayload,
} from "@/features/mixing-activity-templates/types";
import type {
  CreateProductionOrderMixingRecordPayload,
  ProductionOrderMixingRecord,
  ProductionOrderMixingRecordParameter,
  ProductionOrderMixingRecordStage,
  ProductionOrderMixingRecordStep,
  UpdateProductionOrderMixingRecordPayload,
  UpdateProductionOrderMixingRecordResultPayload,
} from "@/features/production-order-mixing-records/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchAllByProductionOrderId = async (
  productionOrderId: string | number,
): Promise<ProductionOrderMixingRecord[]> => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.mixingRecords(productionOrderId),
  );
  return response.data;
};

const fetchById = async (
  recordId: string | number,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.mixingRecordDetail(recordId),
  );
  return response.data;
};

const create = async (
  productionOrderId: string | number,
  payload: CreateProductionOrderMixingRecordPayload,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.mixingRecords(productionOrderId),
    payload,
  );
  return response.data;
};

const update = async (
  recordId: string | number,
  payload: UpdateProductionOrderMixingRecordPayload,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordDetail(recordId),
    payload,
  );
  return response.data;
};

const remove = async (
  recordId: string | number,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.mixingRecordDetail(recordId),
  );
  return response.data;
};

const approveByQaStaff = async (
  recordId: string | number,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordQaStaffApproval(recordId),
  );
  return response.data;
};

const approveByIpcStaff = async (
  recordId: string | number,
): Promise<ProductionOrderMixingRecord> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordIpcStaffApproval(recordId),
  );
  return response.data;
};

const createStage = async (
  recordId: string | number,
  payload: CreateMixingActivityTemplateStagePayload,
): Promise<ProductionOrderMixingRecordStage> => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.mixingRecordStages(recordId),
    payload,
  );
  return response.data;
};

const updateStage = async (
  stageId: string | number,
  payload: UpdateMixingActivityTemplateStagePayload,
): Promise<ProductionOrderMixingRecordStage> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordStageDetail(stageId),
    payload,
  );
  return response.data;
};

const deleteStage = async (
  stageId: string | number,
): Promise<ProductionOrderMixingRecordStage> => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.mixingRecordStageDetail(stageId),
  );
  return response.data;
};

const createStep = async (
  stageId: string | number,
  payload: CreateMixingActivityTemplateStageStepPayload,
): Promise<ProductionOrderMixingRecordStep> => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.mixingRecordStageSteps(stageId),
    payload,
  );
  return response.data;
};

const updateStep = async (
  stepId: string | number,
  payload: UpdateMixingActivityTemplateStageStepPayload,
): Promise<ProductionOrderMixingRecordStep> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordStepDetail(stepId),
    payload,
  );
  return response.data;
};

const deleteStep = async (
  stepId: string | number,
): Promise<ProductionOrderMixingRecordStep> => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.mixingRecordStepDetail(stepId),
  );
  return response.data;
};

const createParameter = async (
  stepId: string | number,
  payload: CreateMixingActivityTemplateStageStepParameterPayload,
): Promise<ProductionOrderMixingRecordParameter> => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.mixingRecordStepParameters(stepId),
    payload,
  );
  return response.data;
};

const updateParameter = async (
  parameterId: string | number,
  payload: UpdateMixingActivityTemplateStageStepParameterPayload,
): Promise<ProductionOrderMixingRecordParameter> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordParameterDetail(parameterId),
    payload,
  );
  return response.data;
};

const deleteParameter = async (
  parameterId: string | number,
): Promise<ProductionOrderMixingRecordParameter> => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.mixingRecordParameterDetail(parameterId),
  );
  return response.data;
};

const updateParameterResult = async (
  parameterId: string | number,
  payload: UpdateProductionOrderMixingRecordResultPayload,
): Promise<ProductionOrderMixingRecordParameter> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.mixingRecordParameterResult(parameterId),
    payload,
  );
  return response.data;
};

const deleteParameterImage = async (
  parameterId: string | number,
): Promise<ProductionOrderMixingRecordParameter> =>
  updateParameterResult(parameterId, { result_image_path: null });

const uploadParameterImage = async (
  parameterId: string | number,
  image: File,
): Promise<ProductionOrderMixingRecordParameter> => {
  const formData = new FormData();
  formData.append("image", image);
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.mixingRecordParameterImage(parameterId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const fetchParameterImage = async (filename: string): Promise<Blob> => {
  const response = await axiosClient.get<Blob>(
    API_ROUTES.productionOrders.mixingRecordParameterImageFile(filename),
    { responseType: "blob" },
  );
  return response.data;
};

const productionOrderMixingRecordsService = {
  fetchAllByProductionOrderId,
  fetchById,
  create,
  update,
  delete: remove,
  approveByQaStaff,
  approveByIpcStaff,
  createStage,
  updateStage,
  deleteStage,
  createStep,
  updateStep,
  deleteStep,
  createParameter,
  updateParameter,
  deleteParameter,
  updateParameterResult,
  deleteParameterImage,
  uploadParameterImage,
  fetchParameterImage,
};

export default productionOrderMixingRecordsService;
