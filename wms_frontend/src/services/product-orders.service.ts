import axiosClient from "@/lib/axios-client";
import {
  getOriginalImageUrl,
  resolveAuthenticatedAssetUrl,
} from "@/lib/authenticated-image";
import type { FiltrationCheck } from "@/features/production-order-filtration-checks";
import type { PostSecondaryPackagingSummary } from "@/features/production-order-post-secondary-packaging-summaries/types";
import type { LineClearanceCheckPayload } from "@/features/production-order-line-clearance-checks";
import type { SecondaryPackagingCheckPayload } from "@/features/production-order-secondary-packaging-checks";
import type { PreSecondaryPackagingCheckPayload } from "@/features/production-order-pre-secondary-packaging-checks";
import type { ProductionOrderProductionGuide } from "@/features/production-order-production-guide";
import type { PrimaryPackagingConfirmationPayload } from "@/features/production-order-primary-packaging-confirmations/types";
import type {
  AttachmentApprovalStatus,
  UpdateProductionOrderAttachmentPayload,
} from "@/features/production-order-attachments/types";
import { API_ROUTES } from "@/lib/api-routes";

const fetchProductionOrders = async () => {
  const response = await axiosClient.get(API_ROUTES.productionOrders.base);
  return response.data;
};

const fetchFinishedProducts = async () => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProducts,
  );
  return response.data;
};

const fetchSemiFinishedProducts = async () => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedProducts,
  );
  return response.data;
};

const fetchProductionOrderById = async (id: string | number) => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionOrders.base}/${id}`,
  );
  return response.data;
};

const fetchProductionOrderLines = async (id: string | number) => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionOrders.base}/${id}/production-order-lines`,
  );
  return response.data;
};

export type UpdateSapProductionOrderPayload = {
  Remarks: string;
};

const updateSapProductionOrder = async (
  id: string | number,
  payload: UpdateSapProductionOrderPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.sapB1Connector(id),
    payload,
  );
  return response.data;
};

export type UpdateProductionOrderChangeContentPayload = {
  change_content: string | null;
};

const updateProductionOrderChangeContent = async (
  id: string | number,
  payload: UpdateProductionOrderChangeContentPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.changeContent(id),
    payload,
  );
  return response.data;
};

type CreateSamplingRequestPayload = {
  location: string;
};

const createSamplingRequest = async (
  id: string | number,
  payload: CreateSamplingRequestPayload,
) => {
  const response = await axiosClient.post(
    `${API_ROUTES.productionOrders.base}/${id}/sampling-requests`,
    payload,
  );
  return response.data;
};

type CreateEnvironmentCheckPayload = {
  room: string;
  temperature_c: string | number;
  humidity_percent: string | number;
  checked_at: string;
};

type UpdateEnvironmentCheckPayload = Partial<CreateEnvironmentCheckPayload>;

type HygieneCheckPayload = {
  room_or_equipment: string;
  cleaning_type: string;
  result: string;
  note?: string | null;
};

type CreateDensityCheckPayload = {
  empty_pycnometer_mass_g: string | number;
  solution_pycnometer_mass_g: string | number;
  water_pycnometer_mass_g: string | number;
  apparent_density?: string | number | null;
};

type CreatePostHomogenizationGranuleCheckPayload = {
  bulk_density: string | number;
  tapped_density: string | number;
  moisture_percent?: string | number | null;
};

type CreatePostPreparationSolutionCheckPayload = {
  solution_color?: string | null;
  solution_clarity?: string | null;
  solution_ph_1?: string | number | null;
  solution_ph_2?: string | number | null;
  solution_ph_3?: string | number | null;
  checked_by_id?: string | number | null;
};

type FactoryReleaseReviewPayload = {
  approved_by_id?: number | string | null;
  registration_number: string;
  raw_material_test_result?: string | null;
  water_test_result?: string | null;
  compressed_air_test_result?: string | null;
  filter_integrity_test_result?: string | null;
  packaging_inspection_result?: string | null;
  finished_product_test_result?: string | null;
  sterilization_result?: string | null;
  online_particle_result?: string | null;
  yield_quantity?: string | null;
  deviation?: string | null;
  environment_monitoring_result?: string | null;
};

type CreateFriabilityCheckPayload = {
  total_weight_before_check: string | number;
  total_weight_after_check: string | number;
};

type CreateDisintegrationCheckPayload = {
  requirement?: string | null;
  dosage_form_stage: string;
  unit_1_passed: boolean;
  unit_2_passed?: boolean | null;
  unit_3_passed?: boolean | null;
  unit_4_passed?: boolean | null;
  unit_5_passed?: boolean | null;
  unit_6_passed?: boolean | null;
};

type CreateVialInspectionCheckPayload = {
  bag_number: number;
  fiber_vial_count: number;
  particulate_count: number;
  damaged_count: number;
  other_defect_count: number;
  note?: string | null;
};

type TabletThicknessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_thickness: string | number;
  unit_2_thickness?: string | number | null;
  unit_3_thickness?: string | number | null;
  unit_4_thickness?: string | number | null;
  unit_5_thickness?: string | number | null;
  unit_6_thickness?: string | number | null;
  unit_7_thickness?: string | number | null;
  unit_8_thickness?: string | number | null;
  unit_9_thickness?: string | number | null;
  unit_10_thickness?: string | number | null;
  unit?: string | null;
};

type CreateSensoryCheckPayload = {
  color?: string | null;
  smell?: string | null;
  taste?: string | null;
  note?: string | null;
};

type ProductSensoryCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_result: boolean | null;
  unit_2_result?: boolean | null;
  unit_3_result?: boolean | null;
  unit_4_result?: boolean | null;
  unit_5_result?: boolean | null;
  unit_6_result?: boolean | null;
  unit_7_result?: boolean | null;
  unit_8_result?: boolean | null;
  unit_9_result?: boolean | null;
  unit_10_result?: boolean | null;
};

type CreateHardCapsuleLeakageCheckPayload = {
  stage: "before_coating" | "after_coating";
  tested_capsule_count: number;
  leaked_capsule_count: number;
};

type CreateBottleVolumeCheckPayload = {
  bottle_1_volume?: string | number;
  bottle_2_volume?: string | number;
  bottle_3_volume?: string | number;
  bottle_4_volume?: string | number;
  bottle_5_volume?: string | number;
  bottle_6_volume?: string | number;
};

type VolumeCheckPayload = {
  package_type?: string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit?: string | null;
  unit_1_volume?: string | number | null;
  unit_2_volume?: string | number | null;
  unit_3_volume?: string | number | null;
  unit_4_volume?: string | number | null;
  unit_5_volume?: string | number | null;
  unit_6_volume?: string | number | null;
};

type CreateSprayDoseCheckPayload = {
  requirement?: string | null;
  unit?: string;
  bottle_1_spray_dose_count: string | number;
  bottle_2_spray_dose_count?: string | number | null;
  bottle_3_spray_dose_count?: string | number | null;
  bottle_4_spray_dose_count?: string | number | null;
  bottle_5_spray_dose_count?: string | number | null;
  bottle_6_spray_dose_count?: string | number | null;
};

type HardnessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_hardness: string | number;
  unit_2_hardness?: string | number | null;
  unit_3_hardness?: string | number | null;
  unit_4_hardness?: string | number | null;
  unit_5_hardness?: string | number | null;
  unit_6_hardness?: string | number | null;
  unit_7_hardness?: string | number | null;
  unit_8_hardness?: string | number | null;
  unit_9_hardness?: string | number | null;
  unit_10_hardness?: string | number | null;
  unit?: string | null;
};

type SemiFinishedGrossWeightCheckPayload = {
  requirement?: string;
  dosage_form_stage?: string | null;
  unit_1_gross_weight: string | number;
  unit_2_gross_weight?: string | number | null;
  unit_3_gross_weight?: string | number | null;
  unit_4_gross_weight?: string | number | null;
  unit_5_gross_weight?: string | number | null;
  unit_6_gross_weight?: string | number | null;
  unit_7_gross_weight?: string | number | null;
  unit_8_gross_weight?: string | number | null;
  unit_9_gross_weight?: string | number | null;
  unit_10_gross_weight?: string | number | null;
  unit?: string;
};

type SemiFinishedNetWeightCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_net_weight: string | number;
  unit_2_net_weight?: string | number | null;
  unit_3_net_weight?: string | number | null;
  unit_4_net_weight?: string | number | null;
  unit_5_net_weight?: string | number | null;
  unit_6_net_weight?: string | number | null;
  unit_7_net_weight?: string | number | null;
  unit_8_net_weight?: string | number | null;
  unit_9_net_weight?: string | number | null;
  unit_10_net_weight?: string | number | null;
  unit?: string | null;
};

type LeakTightnessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_result: boolean;
  unit_2_result?: boolean | null;
  unit_3_result?: boolean | null;
  unit_4_result?: boolean | null;
  unit_5_result?: boolean | null;
  unit_6_result?: boolean | null;
  unit_7_result?: boolean | null;
  unit_8_result?: boolean | null;
  unit_9_result?: boolean | null;
  unit_10_result?: boolean | null;
};

type CreateShellWeightCheckPayload = {
  shell_1_weight: string | number;
  shell_2_weight: string | number;
  shell_3_weight: string | number;
  shell_4_weight: string | number;
  shell_5_weight: string | number;
  shell_6_weight: string | number;
  shell_7_weight: string | number;
  shell_8_weight: string | number;
  shell_9_weight: string | number;
  shell_10_weight: string | number;
  unit?: string;
};

type UpsertTenShellWeightCheckPayload = {
  ten_shells_weight: string | number;
};

type DateCheckApprovalStatus = "approved" | "rejected";

type CreateFinishedProductSummaryPayload = {
  package_count: string | number;
  boxes_per_package: string | number;
  loose_box_count: string | number;
  note?: string | null;
};

type UpdateFinishedProductSummaryPayload =
  Partial<CreateFinishedProductSummaryPayload>;

type SemiFinishedProductSummaryPayload = {
  stage?: string | null;
  input_quantity?: string | number | null;
  input_unit?: string | null;
  load_quantity?: string | number | null;
  load_unit?: string | null;
  packed_quantity?: string | number | null;
  packed_unit?: string | null;
  leftover_quantity?: string | number | null;
  leftover_unit?: string | null;
  waste_quantity?: string | number | null;
  waste_unit?: string | null;
};

type PostSecondaryPackagingSummaryPayload = {
  semi_finished_product_order_id: string | number;
  received_bag_count: string | number;
  remaining_quantity: string | number;
  unit?: string | null;
  remaining_reason?: string | null;
};

type PostSecondaryPackagingPendingProcessItemPayload = {
  pending_quantity: string | number;
  pending_reason: string;
  processing_plan?: string | null;
};

type PostSecondaryPackagingPendingCancellationItemPayload = {
  cancellation_quantity: string | number;
  cancellation_reason: string;
  cancellation_plan?: string | null;
};

type MaterialSummaryPayload = {
  material_code: string;
  lot_no?: string | null;
  received_quantity?: string | number | null;
  used_quantity?: string | number | null;
  supplier_waste_quantity?: string | number | null;
  production_waste_quantity?: string | number | null;
  remaining_quantity?: string | number | null;
  sample_quantity?: string | number | null;
  summarized_by_id?: string | number | null;
};

type MaterialProcessSummaryPayload = {
  process_stage: string;
  yielded_quantity: string | number;
  yielded_unit?: string | null;
  moisture_percent?: string | number | null;
  image?: File | null;
  note?: string | null;
};

type SamplingRecordPayload = {
  sampling_type: string;
  quantity: string | number;
  unit: string;
};

type DisinfectantPreparationPayload = {
  workshop_id: string | number;
  disinfectant_name: string;
  purpose: string;
  base_material_name: string;
  base_material_content: string | number;
  base_material_amount_l: string | number;
  prepared_volume_l: string | number;
  actual_concentration: string | number;
};

type UpsertCylinderCalibrationPayload = {
  cylinder_code?: string;
  calibration_number: string | number;
};

type UpdateCylinderCalibrationPayload = {
  cylinder_code?: string | null;
  calibration_number?: string | number;
};

const fetchEnvironmentChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.environmentChecks(id),
  );
  return response.data;
};

const fetchEnvironmentCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.environmentCheckDetail(checkId),
  );
  return response.data;
};

const fetchLineClearanceChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.lineClearanceChecks(id),
  );
  return response.data;
};

const fetchLineClearanceCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.lineClearanceCheckDetail(checkId),
  );
  return response.data;
};

const createLineClearanceCheck = async (
  id: string | number,
  payload: LineClearanceCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.lineClearanceChecks(id),
    payload,
  );
  return response.data;
};

const updateLineClearanceCheck = async (
  checkId: string | number,
  payload: Partial<LineClearanceCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.lineClearanceCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteLineClearanceCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.lineClearanceCheckDetail(checkId),
  );
  return response.data;
};

const fetchSecondaryPackagingChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.secondaryPackagingChecks(id),
  );
  return response.data;
};

const fetchSecondaryPackagingCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.secondaryPackagingCheckDetail(checkId),
  );
  return response.data;
};

const createSecondaryPackagingCheck = async (
  id: string | number,
  payload: SecondaryPackagingCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.secondaryPackagingChecks(id),
    payload,
  );
  return response.data;
};

const updateSecondaryPackagingCheck = async (
  checkId: string | number,
  payload: Partial<SecondaryPackagingCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.secondaryPackagingCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteSecondaryPackagingCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.secondaryPackagingCheckDetail(checkId),
  );
  return response.data;
};

const fetchPreSecondaryPackagingChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.preSecondaryPackagingChecks(id),
  );
  return response.data;
};

const fetchPreSecondaryPackagingCheckById = async (
  checkId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.preSecondaryPackagingCheckDetail(checkId),
  );
  return response.data;
};

const createPreSecondaryPackagingCheck = async (
  id: string | number,
  payload: PreSecondaryPackagingCheckPayload | FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.preSecondaryPackagingChecks(id),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const updatePreSecondaryPackagingCheck = async (
  checkId: string | number,
  payload: Partial<PreSecondaryPackagingCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.preSecondaryPackagingCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const addPreSecondaryPackagingCheckImages = async (
  checkId: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.preSecondaryPackagingCheckImages(checkId),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deletePreSecondaryPackagingCheckImage = async (
  imageId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.preSecondaryPackagingCheckImageDetail(imageId),
  );
  return response.data;
};

const deletePreSecondaryPackagingCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.preSecondaryPackagingCheckDetail(checkId),
  );
  return response.data;
};

const fetchHygieneChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hygieneChecks(id),
  );
  return response.data;
};

const fetchHygieneCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hygieneCheckDetail(checkId),
  );
  return response.data;
};

const fetchSteamSterilizationChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.steamSterilizationChecks(id),
  );
  return response.data;
};

const fetchSteamSterilizationCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.steamSterilizationCheckDetail(checkId),
  );
  return response.data;
};

const createSteamSterilizationCheck = async (
  id: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.steamSterilizationChecks(id),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const updateSteamSterilizationCheck = async (
  checkId: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.steamSterilizationCheckDetail(checkId),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteSteamSterilizationCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.steamSterilizationCheckDetail(checkId),
  );
  return response.data;
};

const createEnvironmentCheck = async (
  id: string | number,
  payload: CreateEnvironmentCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.environmentChecks(id),
    payload,
  );
  return response.data;
};

const fetchFiltrationChecks = async (
  id: string | number,
): Promise<FiltrationCheck[]> => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.filtrationChecks(id),
  );
  return response.data;
};

const fetchFiltrationCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.filtrationCheckDetail(checkId),
  );
  return response.data;
};

const createFiltrationCheck = async (
  id: string | number,
  payload: Record<string, unknown>,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.filtrationChecks(id),
    payload,
  );
  return response.data;
};

const updateFiltrationCheck = async (
  checkId: string | number,
  payload: Record<string, unknown>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.filtrationCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteFiltrationCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.filtrationCheckDetail(checkId),
  );
  return response.data;
};

const createHygieneCheck = async (
  id: string | number,
  payload: HygieneCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.hygieneChecks(id),
    payload,
  );
  return response.data;
};

const fetchDensityChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.densityChecks(id),
  );
  return response.data;
};

const fetchDensityCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.densityCheckDetail(checkId),
  );
  return response.data;
};

const createDensityCheck = async (
  id: string | number,
  payload: CreateDensityCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.densityChecks(id),
    payload,
  );
  return response.data;
};

const updateDensityCheck = async (
  checkId: string | number,
  payload: Partial<CreateDensityCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.densityCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const updateEnvironmentCheck = async (
  checkId: string | number,
  payload: UpdateEnvironmentCheckPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.environmentCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteEnvironmentCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.environmentCheckDetail(checkId),
  );
  return response.data;
};

const updateHygieneCheck = async (
  checkId: string | number,
  payload: Partial<HygieneCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.hygieneCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteHygieneCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.hygieneCheckDetail(checkId),
  );
  return response.data;
};

const deleteDensityCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.densityCheckDetail(checkId),
  );
  return response.data;
};

const fetchPostHomogenizationGranuleChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postHomogenizationGranuleChecks(id),
  );
  return response.data;
};

const fetchPostHomogenizationGranuleCheckById = async (
  checkId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postHomogenizationGranuleCheckDetail(checkId),
  );
  return response.data;
};

const createPostHomogenizationGranuleCheck = async (
  id: string | number,
  payload: CreatePostHomogenizationGranuleCheckPayload | FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.postHomogenizationGranuleChecks(id),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const updatePostHomogenizationGranuleCheck = async (
  checkId: string | number,
  payload: Partial<CreatePostHomogenizationGranuleCheckPayload> | FormData,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.postHomogenizationGranuleCheckDetail(checkId),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const deletePostHomogenizationGranuleCheck = async (
  checkId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.postHomogenizationGranuleCheckDetail(checkId),
  );
  return response.data;
};

const fetchPostPreparationSolutionChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postPreparationSolutionChecks(id),
  );
  return response.data;
};

const fetchPostPreparationSolutionCheckById = async (
  checkId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postPreparationSolutionCheckDetail(checkId),
  );
  return response.data;
};

const createPostPreparationSolutionCheck = async (
  id: string | number,
  payload: CreatePostPreparationSolutionCheckPayload | FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.postPreparationSolutionChecks(id),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const updatePostPreparationSolutionCheck = async (
  checkId: string | number,
  payload: Partial<CreatePostPreparationSolutionCheckPayload> | FormData,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.postPreparationSolutionCheckDetail(checkId),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const deletePostPreparationSolutionCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.postPreparationSolutionCheckDetail(checkId),
  );
  return response.data;
};

const fetchFriabilityChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.friabilityChecks(id),
  );
  return response.data;
};

const fetchFriabilityCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.friabilityCheckDetail(checkId),
  );
  return response.data;
};

const createFriabilityCheck = async (
  id: string | number,
  payload: CreateFriabilityCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.friabilityChecks(id),
    payload,
  );
  return response.data;
};

const updateFriabilityCheck = async (
  checkId: string | number,
  payload: Partial<CreateFriabilityCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.friabilityCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteFriabilityCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.friabilityCheckDetail(checkId),
  );
  return response.data;
};

const fetchDisintegrationChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.disintegrationChecks(id),
  );
  return response.data;
};

const fetchDisintegrationCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.disintegrationCheckDetail(checkId),
  );
  return response.data;
};

const createDisintegrationCheck = async (
  id: string | number,
  payload: CreateDisintegrationCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.disintegrationChecks(id),
    payload,
  );
  return response.data;
};

const updateDisintegrationCheck = async (
  checkId: string | number,
  payload: Partial<CreateDisintegrationCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.disintegrationCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteDisintegrationCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.disintegrationCheckDetail(checkId),
  );
  return response.data;
};

const fetchVialInspectionChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.vialInspectionChecks(id),
  );
  return response.data;
};

const fetchVialInspectionCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.vialInspectionCheckDetail(checkId),
  );
  return response.data;
};

const createVialInspectionCheck = async (
  id: string | number,
  payload: CreateVialInspectionCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.vialInspectionChecks(id),
    payload,
  );
  return response.data;
};

const updateVialInspectionCheck = async (
  checkId: string | number,
  payload: Partial<CreateVialInspectionCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.vialInspectionCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteVialInspectionCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.vialInspectionCheckDetail(checkId),
  );
  return response.data;
};

const fetchSensoryChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.sensoryChecks(id),
  );
  return response.data;
};

const fetchSensoryCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.sensoryCheckDetail(checkId),
  );
  return response.data;
};

const createSensoryCheck = async (
  id: string | number,
  payload: CreateSensoryCheckPayload | FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.sensoryChecks(id),
    payload,
    payload instanceof FormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined,
  );
  return response.data;
};

const updateSensoryCheck = async (
  checkId: string | number,
  payload: Partial<CreateSensoryCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.sensoryCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const addSensoryCheckImages = async (
  checkId: string | number,
  images: File[],
) => {
  const formData = new FormData();
  images.forEach((image) => formData.append("images", image));

  const response = await axiosClient.post(
    API_ROUTES.productionOrders.sensoryCheckImages(checkId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const createPrimaryPackagingConfirmation = async (
  productionOrderId: string | number,
  payload: PrimaryPackagingConfirmationPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.primaryPackagingConfirmations(
      productionOrderId,
    ),
    payload,
  );
  return response.data;
};

const fetchPrimaryPackagingConfirmations = async (
  productionOrderId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.primaryPackagingConfirmations(
      productionOrderId,
    ),
  );
  return response.data;
};

const fetchPrimaryPackagingConfirmationById = async (
  confirmationId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.primaryPackagingConfirmationDetail(
      confirmationId,
    ),
  );
  return response.data;
};

const deleteSensoryCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.sensoryCheckDetail(checkId),
  );
  return response.data;
};

const fetchProductSensoryChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.productSensoryChecks(id),
  );
  return response.data;
};

const fetchProductSensoryCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.productSensoryCheckDetail(checkId),
  );
  return response.data;
};

const createProductSensoryCheck = async (
  id: string | number,
  payload: ProductSensoryCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.productSensoryChecks(id),
    payload,
  );
  return response.data;
};

const updateProductSensoryCheck = async (
  checkId: string | number,
  payload: Partial<ProductSensoryCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.productSensoryCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const addProductSensoryCheckImages = async (
  checkId: string | number,
  images: File[],
) => {
  const formData = new FormData();
  images.forEach((image) => formData.append("images", image));

  const response = await axiosClient.post(
    API_ROUTES.productionOrders.productSensoryCheckImages(checkId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteProductSensoryCheckImage = async (imageId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.productSensoryCheckImage(imageId),
  );
  return response.data;
};

const deleteProductSensoryCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.productSensoryCheckDetail(checkId),
  );
  return response.data;
};

const fetchHardCapsuleLeakageChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hardCapsuleLeakageChecks(id),
  );
  return response.data;
};

const fetchHardCapsuleLeakageCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hardCapsuleLeakageCheckDetail(checkId),
  );
  return response.data;
};

const createHardCapsuleLeakageCheck = async (
  id: string | number,
  payload: CreateHardCapsuleLeakageCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.hardCapsuleLeakageChecks(id),
    payload,
  );
  return response.data;
};

const updateHardCapsuleLeakageCheck = async (
  checkId: string | number,
  payload: Partial<CreateHardCapsuleLeakageCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.hardCapsuleLeakageCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteHardCapsuleLeakageCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.hardCapsuleLeakageCheckDetail(checkId),
  );
  return response.data;
};

const fetchLeakTightnessChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.leakTightnessChecks(id),
  );
  return response.data;
};

const fetchLeakTightnessCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.leakTightnessCheckDetail(checkId),
  );
  return response.data;
};

const createLeakTightnessCheck = async (
  id: string | number,
  payload: LeakTightnessCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.leakTightnessChecks(id),
    payload,
  );
  return response.data;
};

const updateLeakTightnessCheck = async (
  checkId: string | number,
  payload: Partial<LeakTightnessCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.leakTightnessCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteLeakTightnessCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.leakTightnessCheckDetail(checkId),
  );
  return response.data;
};

const fetchBottleVolumeChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.bottleVolumeChecks(id),
  );
  return response.data;
};

const fetchBottleVolumeCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.bottleVolumeCheckDetail(checkId),
  );
  return response.data;
};

const createBottleVolumeCheck = async (
  id: string | number,
  payload: CreateBottleVolumeCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.bottleVolumeChecks(id),
    payload,
  );
  return response.data;
};

const fetchVolumeChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.volumeChecks(id),
  );
  return response.data;
};

const fetchVolumeCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.volumeCheckDetail(checkId),
  );
  return response.data;
};

const createVolumeCheck = async (
  id: string | number,
  payload: VolumeCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.volumeChecks(id),
    payload,
  );
  return response.data;
};

const updateVolumeCheck = async (
  checkId: string | number,
  payload: Partial<VolumeCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.volumeCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const addVolumeCheckImages = async (
  checkId: string | number,
  images: File[],
) => {
  const formData = new FormData();
  images.forEach((image) => formData.append("images", image));

  const response = await axiosClient.post(
    API_ROUTES.productionOrders.volumeCheckImages(checkId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteVolumeCheckImage = async (imageId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.volumeCheckImage(imageId),
  );
  return response.data;
};

const deleteVolumeCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.volumeCheckDetail(checkId),
  );
  return response.data;
};

const fetchSprayDoseChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.sprayDoseChecks(id),
  );
  return response.data;
};

const fetchSprayDoseCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.sprayDoseCheckDetail(checkId),
  );
  return response.data;
};

const createSprayDoseCheck = async (
  id: string | number,
  payload: CreateSprayDoseCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.sprayDoseChecks(id),
    payload,
  );
  return response.data;
};

const fetchHardnessChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hardnessChecks(id),
  );
  return response.data;
};

const fetchHardnessCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.hardnessCheckDetail(checkId),
  );
  return response.data;
};

const createHardnessCheck = async (
  id: string | number,
  payload: HardnessCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.hardnessChecks(id),
    payload,
  );
  return response.data;
};

const updateHardnessCheck = async (
  checkId: string | number,
  payload: Partial<HardnessCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.hardnessCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteHardnessCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.hardnessCheckDetail(checkId),
  );
  return response.data;
};

const fetchTabletThicknessChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.tabletThicknessChecks(id),
  );
  return response.data;
};

const fetchTabletThicknessCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.tabletThicknessCheckDetail(checkId),
  );
  return response.data;
};

const createTabletThicknessCheck = async (
  id: string | number,
  payload: TabletThicknessCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.tabletThicknessChecks(id),
    payload,
  );
  return response.data;
};

const updateTabletThicknessCheck = async (
  checkId: string | number,
  payload: Partial<TabletThicknessCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.tabletThicknessCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteTabletThicknessCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.tabletThicknessCheckDetail(checkId),
  );
  return response.data;
};

const fetchSemiFinishedGrossWeightChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(id),
  );
  return response.data;
};

const fetchSemiFinishedGrossWeightCheckById = async (
  checkId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedGrossWeightCheckDetail(checkId),
  );
  return response.data;
};

const createSemiFinishedGrossWeightCheck = async (
  id: string | number,
  payload: SemiFinishedGrossWeightCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.semiFinishedGrossWeightChecks(id),
    payload,
  );
  return response.data;
};

const updateSemiFinishedGrossWeightCheck = async (
  checkId: string | number,
  payload: Partial<SemiFinishedGrossWeightCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.semiFinishedGrossWeightCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteSemiFinishedGrossWeightCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.semiFinishedGrossWeightCheckDetail(checkId),
  );
  return response.data;
};

const fetchSemiFinishedNetWeightChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedNetWeightChecks(id),
  );
  return response.data;
};

const fetchSemiFinishedNetWeightCheckById = async (
  checkId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedNetWeightCheckDetail(checkId),
  );
  return response.data;
};

const createSemiFinishedNetWeightCheck = async (
  id: string | number,
  payload: SemiFinishedNetWeightCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.semiFinishedNetWeightChecks(id),
    payload,
  );
  return response.data;
};

const updateSemiFinishedNetWeightCheck = async (
  checkId: string | number,
  payload: Partial<SemiFinishedNetWeightCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.semiFinishedNetWeightCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteSemiFinishedNetWeightCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.semiFinishedNetWeightCheckDetail(checkId),
  );
  return response.data;
};

const fetchShellWeightChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.shellWeightChecks(id),
  );
  return response.data;
};

const fetchShellWeightCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.shellWeightCheckDetail(checkId),
  );
  return response.data;
};

const createShellWeightCheck = async (
  id: string | number,
  payload: CreateShellWeightCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.shellWeightChecks(id),
    payload,
  );
  return response.data;
};

const updateShellWeightCheck = async (
  checkId: string | number,
  payload: Partial<CreateShellWeightCheckPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.shellWeightCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteShellWeightCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.shellWeightCheckDetail(checkId),
  );
  return response.data;
};

const fetchTenShellWeightCheck = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.tenShellWeightCheck(id),
  );
  return response.data;
};

const fetchTenShellWeightCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.tenShellWeightCheckDetail(checkId),
  );
  return response.data;
};

const upsertTenShellWeightCheck = async (
  id: string | number,
  payload: UpsertTenShellWeightCheckPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.tenShellWeightCheck(id),
    payload,
  );
  return response.data;
};

const updateTenShellWeightCheck = async (
  checkId: string | number,
  payload: UpsertTenShellWeightCheckPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.tenShellWeightCheckDetail(checkId),
    payload,
  );
  return response.data;
};

const deleteTenShellWeightCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.tenShellWeightCheckDetail(checkId),
  );
  return response.data;
};

const fetchDateChecks = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.dateChecks(id),
  );
  return response.data;
};

const fetchDateCheckById = async (checkId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.dateCheckDetail(checkId),
  );
  return response.data;
};

const createDateCheck = async (id: string | number, payload: FormData) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.dateChecks(id),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const updateDateCheck = async (checkId: string | number, payload: FormData) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.dateCheckDetail(checkId),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const updateDateCheckApproval = async (
  checkId: string | number,
  approvalStatus: DateCheckApprovalStatus,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.dateCheckApproval(checkId),
    { approval_status: approvalStatus },
  );
  return response.data;
};

const deleteDateCheck = async (checkId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.dateCheckDetail(checkId),
  );
  return response.data;
};

const addDateCheckImages = async (
  checkId: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.dateCheckImages(checkId),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteDateCheckImage = async (imageId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.dateCheckImage(imageId),
  );
  return response.data;
};

const fetchProductionOrderAttachments = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.attachments(id),
  );
  return response.data;
};

const fetchProductionOrderAttachmentById = async (
  attachmentId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.attachmentDetail(attachmentId),
  );
  return response.data;
};

const createProductionOrderAttachment = async (
  id: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.attachments(id),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const updateProductionOrderAttachment = async (
  attachmentId: string | number,
  payload: UpdateProductionOrderAttachmentPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.attachmentDetail(attachmentId),
    payload,
  );
  return response.data;
};

const updateProductionOrderAttachmentApproval = async (
  attachmentId: string | number,
  approvalStatus: AttachmentApprovalStatus,
  approvalNote?: string | null,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.attachmentApproval(attachmentId),
    {
      approval_status: approvalStatus,
      ...(approvalNote ? { approval_note: approvalNote } : {}),
    },
  );
  return response.data;
};

const addProductionOrderAttachmentFiles = async (
  attachmentId: string | number,
  payload: FormData,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.attachmentFiles(attachmentId),
    payload,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteProductionOrderAttachmentFile = async (fileId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.attachmentFile(fileId),
  );
  return response.data;
};

const deleteProductionOrderAttachment = async (
  attachmentId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.attachmentDetail(attachmentId),
  );
  return response.data;
};

const fetchAuthenticatedAsset = async (
  path: string,
  options?: { original?: boolean; signal?: AbortSignal },
) => {
  const response = await axiosClient.get(
    resolveAuthenticatedAssetUrl(
      options?.original ? getOriginalImageUrl(path) : path,
    ),
    {
      responseType: "blob",
      signal: options?.signal,
    },
  );
  return response;
};

const fetchFinishedProductSummaries = async () => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProductSummaries,
  );
  return response.data;
};

const fetchFinishedProductSummary = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProductSummary(id),
  );
  return response.data;
};

const fetchFinishedProductSummaryById = async (summaryId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.finishedProductSummaryDetail(summaryId),
  );
  return response.data;
};

const createFinishedProductSummary = async (
  id: string | number,
  payload: CreateFinishedProductSummaryPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.finishedProductSummary(id),
    payload,
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

const fetchSamplingRecords = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.samplingRecords(id),
  );
  return response.data;
};

const fetchSamplingRecordById = async (recordId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.samplingRecordDetail(recordId),
  );
  return response.data;
};

const createSamplingRecord = async (
  id: string | number,
  payload: SamplingRecordPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.samplingRecords(id),
    payload,
  );
  return response.data;
};

const updateSamplingRecord = async (
  recordId: string | number,
  payload: Partial<SamplingRecordPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.samplingRecordDetail(recordId),
    payload,
  );
  return response.data;
};

const deleteSamplingRecord = async (recordId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.samplingRecordDetail(recordId),
  );
  return response.data;
};

const fetchDisinfectantPreparations = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.disinfectantPreparations(id),
  );
  return response.data;
};

const fetchDisinfectantPreparationById = async (
  preparationId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.disinfectantPreparationDetail(preparationId),
  );
  return response.data;
};

const createDisinfectantPreparation = async (
  id: string | number,
  payload: DisinfectantPreparationPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.disinfectantPreparations(id),
    payload,
  );
  return response.data;
};

const updateDisinfectantPreparation = async (
  preparationId: string | number,
  payload: Partial<DisinfectantPreparationPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.disinfectantPreparationDetail(preparationId),
    payload,
  );
  return response.data;
};

const deleteDisinfectantPreparation = async (
  preparationId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.disinfectantPreparationDetail(preparationId),
  );
  return response.data;
};

const fetchSemiFinishedProductSummaries = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedProductSummaries(id),
  );
  return response.data;
};

const fetchSemiFinishedProductSummaryById = async (
  summaryId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.semiFinishedProductSummaryDetail(summaryId),
  );
  return response.data;
};

const createSemiFinishedProductSummary = async (
  id: string | number,
  payload: SemiFinishedProductSummaryPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.semiFinishedProductSummaries(id),
    payload,
  );
  return response.data;
};

const updateSemiFinishedProductSummary = async (
  summaryId: string | number,
  payload: Partial<SemiFinishedProductSummaryPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.semiFinishedProductSummaryDetail(summaryId),
    payload,
  );
  return response.data;
};

const deleteSemiFinishedProductSummary = async (summaryId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.semiFinishedProductSummaryDetail(summaryId),
  );
  return response.data;
};

const fetchPostSecondaryPackagingSummaries = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaries(id),
  );
  return response.data;
};

const fetchPostSecondaryPackagingSummaryById = async (
  summaryId: string | number,
): Promise<PostSecondaryPackagingSummary> => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(summaryId),
  );
  return response.data;
};

const createPostSecondaryPackagingSummary = async (
  id: string | number,
  payload: PostSecondaryPackagingSummaryPayload,
): Promise<PostSecondaryPackagingSummary> => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaries(id),
    payload,
  );
  return response.data;
};

const updatePostSecondaryPackagingSummary = async (
  summaryId: string | number,
  payload: Partial<PostSecondaryPackagingSummaryPayload>,
): Promise<PostSecondaryPackagingSummary> => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(summaryId),
    payload,
  );
  return response.data;
};

const deletePostSecondaryPackagingSummary = async (
  summaryId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.postSecondaryPackagingSummaryDetail(summaryId),
  );
  return response.data;
};

const createPostSecondaryPackagingPendingProcessItem = async (
  summaryId: string | number,
  payload: PostSecondaryPackagingPendingProcessItemPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingProcessItems(
      summaryId,
    ),
    payload,
  );
  return response.data;
};

const fetchPostSecondaryPackagingPendingProcessItems = async (
  summaryId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingProcessItems(
      summaryId,
    ),
  );
  return response.data;
};

const fetchPostSecondaryPackagingPendingProcessItemById = async (
  itemId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingProcessItemDetail(
      itemId,
    ),
  );
  return response.data;
};

const updatePostSecondaryPackagingPendingProcessItem = async (
  itemId: string | number,
  payload: Partial<PostSecondaryPackagingPendingProcessItemPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingProcessItemDetail(
      itemId,
    ),
    payload,
  );
  return response.data;
};

const deletePostSecondaryPackagingPendingProcessItem = async (
  itemId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingProcessItemDetail(
      itemId,
    ),
  );
  return response.data;
};

const createPostSecondaryPackagingPendingCancellationItem = async (
  summaryId: string | number,
  payload: PostSecondaryPackagingPendingCancellationItemPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingCancellationItems(
      summaryId,
    ),
    payload,
  );
  return response.data;
};

const fetchPostSecondaryPackagingPendingCancellationItems = async (
  summaryId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingCancellationItems(
      summaryId,
    ),
  );
  return response.data;
};

const fetchPostSecondaryPackagingPendingCancellationItemById = async (
  itemId: string | number,
) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingCancellationItemDetail(
      itemId,
    ),
  );
  return response.data;
};

const updatePostSecondaryPackagingPendingCancellationItem = async (
  itemId: string | number,
  payload: Partial<PostSecondaryPackagingPendingCancellationItemPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingCancellationItemDetail(
      itemId,
    ),
    payload,
  );
  return response.data;
};

const deletePostSecondaryPackagingPendingCancellationItem = async (
  itemId: string | number,
) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.postSecondaryPackagingPendingCancellationItemDetail(
      itemId,
    ),
  );
  return response.data;
};

const fetchProductionOrderDocumentControl = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.documentControl(id),
  );
  return response.data;
};

const fetchProductionGuide = async (
  id: string | number,
): Promise<ProductionOrderProductionGuide | null> => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.productionGuide(id),
  );
  return response.data;
};

const uploadProductionGuide = async (id: string | number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.productionGuide(id),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const downloadProductionGuide = async (id: string | number) =>
  axiosClient.get(API_ROUTES.productionOrders.productionGuideFile(id), {
    responseType: "blob",
  });

const deleteProductionGuide = async (id: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.productionGuide(id),
  );
  return response.data;
};

const issueProductionOrderBatchRecord = async (id: string | number) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.issueBatchRecord(id),
  );
  return response.data;
};

const receiveProductionOrderBatchRecord = async (id: string | number) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.receiveBatchRecord(id),
  );
  return response.data;
};

const receiveProductionOrderTestCertificate = async (id: string | number) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.receiveTestCertificate(id),
  );
  return response.data;
};

const receiveProductionOrderWarehouseRelease = async (id: string | number) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.receiveWarehouseRelease(id),
  );
  return response.data;
};

const fetchMaterialSummaries = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.materialSummaries(id),
  );
  return response.data;
};

const fetchMaterialSummaryById = async (summaryId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.materialSummaryDetail(summaryId),
  );
  return response.data;
};

const createMaterialSummary = async (
  id: string | number,
  payload: MaterialSummaryPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.materialSummaries(id),
    payload,
  );
  return response.data;
};

const updateMaterialSummary = async (
  summaryId: string | number,
  payload: Partial<MaterialSummaryPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.materialSummaryDetail(summaryId),
    payload,
  );
  return response.data;
};

const deleteMaterialSummary = async (summaryId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.materialSummaryDetail(summaryId),
  );
  return response.data;
};

const createMaterialProcessSummary = async (
  id: string | number,
  payload: MaterialProcessSummaryPayload,
) => {
  const formData = new FormData();

  formData.append("process_stage", payload.process_stage);
  formData.append("yielded_quantity", String(payload.yielded_quantity));
  formData.append("yielded_unit", payload.yielded_unit?.trim() || "kg");

  if (
    payload.moisture_percent !== null &&
    payload.moisture_percent !== undefined
  ) {
    const moisturePercent = String(payload.moisture_percent).trim();
    if (moisturePercent) formData.append("moisture_percent", moisturePercent);
  }
  if (payload.note?.trim()) formData.append("note", payload.note.trim());
  if (payload.image) formData.append("image", payload.image);

  const response = await axiosClient.post(
    API_ROUTES.productionOrders.materialProcessSummaries(id),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const fetchMaterialProcessSummaries = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.materialProcessSummaries(id),
  );
  return response.data;
};

const fetchMaterialProcessSummaryById = async (summaryId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.materialProcessSummaryDetail(summaryId),
  );
  return response.data;
};

const updateMaterialProcessSummary = async (
  summaryId: string | number,
  payload: Partial<MaterialProcessSummaryPayload>,
) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    formData.append(key, value instanceof File ? value : String(value));
  });

  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.materialProcessSummaryDetail(summaryId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

const deleteMaterialProcessSummary = async (summaryId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.materialProcessSummaryDetail(summaryId),
  );
  return response.data;
};

const fetchFactoryReleaseReviews = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.factoryReleaseReviews(id),
  );
  return response.data;
};

const fetchFactoryReleaseReviewById = async (reviewId: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.factoryReleaseReviewDetail(reviewId),
  );
  return response.data;
};

const createFactoryReleaseReview = async (
  id: string | number,
  payload: FactoryReleaseReviewPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.factoryReleaseReviews(id),
    payload,
  );
  return response.data;
};

const updateFactoryReleaseReview = async (
  reviewId: string | number,
  payload: Partial<FactoryReleaseReviewPayload>,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.factoryReleaseReviewDetail(reviewId),
    payload,
  );
  return response.data;
};

const deleteFactoryReleaseReview = async (reviewId: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.factoryReleaseReviewDetail(reviewId),
  );
  return response.data;
};

const fetchCylinderCalibration = async (id: string | number) => {
  const response = await axiosClient.get(
    API_ROUTES.productionOrders.cylinderCalibration(id),
  );
  return response.data;
};

const upsertCylinderCalibration = async (
  id: string | number,
  payload: UpsertCylinderCalibrationPayload,
) => {
  const response = await axiosClient.post(
    API_ROUTES.productionOrders.cylinderCalibration(id),
    payload,
  );
  return response.data;
};

const updateCylinderCalibration = async (
  id: string | number,
  payload: UpdateCylinderCalibrationPayload,
) => {
  const response = await axiosClient.patch(
    API_ROUTES.productionOrders.cylinderCalibration(id),
    payload,
  );
  return response.data;
};

const deleteCylinderCalibration = async (id: string | number) => {
  const response = await axiosClient.delete(
    API_ROUTES.productionOrders.cylinderCalibration(id),
  );
  return response.data;
};

const exportWarehouseRelease = async (
  id: string | number,
  stageId: number[],
) => {
  const response = await axiosClient.post(
    `${API_ROUTES.productionOrders.base}/${id}/production-order-lines/export`,
    { stageId },
    { responseType: "blob" },
  );
  return response;
};

const exportWeighingTicket = async (
  id: string | number,
  stageIds: number[],
) => {
  const response = await axiosClient.post(
    `${API_ROUTES.productionOrders.base}/${id}/production-order-lines/weighing-ticket/export`,
    { stageIds },
    { responseType: "blob" },
  );
  return response;
};

const exportPostWeighingMaterialCheck = async (
  id: string | number,
  stageIds: number[],
) => {
  const response = await axiosClient.post(
    `${API_ROUTES.productionOrders.base}/${id}/production-order-lines/post-weighing-material-check/export`,
    stageIds.length > 0 ? { stageIds } : {},
    { responseType: "blob" },
  );
  return response;
};

const exportProductionOrder = async (id: string | number) => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionOrders.base}/${id}/export`,
    { responseType: "blob" },
  );
  return response;
};

const productOrdersService = {
  fetchProductionOrders,
  fetchFinishedProducts,
  fetchSemiFinishedProducts,
  fetchProductionOrderById,
  fetchProductionOrderLines,
  updateSapProductionOrder,
  updateProductionOrderChangeContent,
  createSamplingRequest,
  fetchEnvironmentChecks,
  fetchEnvironmentCheckById,
  fetchLineClearanceChecks,
  fetchLineClearanceCheckById,
  createLineClearanceCheck,
  updateLineClearanceCheck,
  deleteLineClearanceCheck,
  fetchSecondaryPackagingChecks,
  fetchSecondaryPackagingCheckById,
  createSecondaryPackagingCheck,
  updateSecondaryPackagingCheck,
  deleteSecondaryPackagingCheck,
  fetchPreSecondaryPackagingChecks,
  fetchPreSecondaryPackagingCheckById,
  createPreSecondaryPackagingCheck,
  updatePreSecondaryPackagingCheck,
  addPreSecondaryPackagingCheckImages,
  deletePreSecondaryPackagingCheckImage,
  deletePreSecondaryPackagingCheck,
  fetchHygieneChecks,
  fetchHygieneCheckById,
  fetchSteamSterilizationChecks,
  fetchSteamSterilizationCheckById,
  createSteamSterilizationCheck,
  updateSteamSterilizationCheck,
  deleteSteamSterilizationCheck,
  fetchFiltrationChecks,
  fetchFiltrationCheckById,
  createFiltrationCheck,
  updateFiltrationCheck,
  deleteFiltrationCheck,
  createEnvironmentCheck,
  updateEnvironmentCheck,
  deleteEnvironmentCheck,
  createHygieneCheck,
  updateHygieneCheck,
  deleteHygieneCheck,
  fetchDensityChecks,
  fetchDensityCheckById,
  createDensityCheck,
  updateDensityCheck,
  deleteDensityCheck,
  fetchPostHomogenizationGranuleChecks,
  fetchPostHomogenizationGranuleCheckById,
  createPostHomogenizationGranuleCheck,
  updatePostHomogenizationGranuleCheck,
  deletePostHomogenizationGranuleCheck,
  fetchPostPreparationSolutionChecks,
  fetchPostPreparationSolutionCheckById,
  createPostPreparationSolutionCheck,
  updatePostPreparationSolutionCheck,
  deletePostPreparationSolutionCheck,
  fetchFriabilityChecks,
  fetchFriabilityCheckById,
  createFriabilityCheck,
  updateFriabilityCheck,
  deleteFriabilityCheck,
  fetchDisintegrationChecks,
  fetchDisintegrationCheckById,
  createDisintegrationCheck,
  updateDisintegrationCheck,
  deleteDisintegrationCheck,
  fetchVialInspectionChecks,
  fetchVialInspectionCheckById,
  createVialInspectionCheck,
  updateVialInspectionCheck,
  deleteVialInspectionCheck,
  fetchSensoryChecks,
  fetchSensoryCheckById,
  createSensoryCheck,
  updateSensoryCheck,
  addSensoryCheckImages,
  createPrimaryPackagingConfirmation,
  fetchPrimaryPackagingConfirmations,
  fetchPrimaryPackagingConfirmationById,
  deleteSensoryCheck,
  fetchProductSensoryChecks,
  fetchProductSensoryCheckById,
  createProductSensoryCheck,
  updateProductSensoryCheck,
  addProductSensoryCheckImages,
  deleteProductSensoryCheckImage,
  deleteProductSensoryCheck,
  fetchHardCapsuleLeakageChecks,
  fetchHardCapsuleLeakageCheckById,
  createHardCapsuleLeakageCheck,
  updateHardCapsuleLeakageCheck,
  deleteHardCapsuleLeakageCheck,
  fetchLeakTightnessChecks,
  fetchLeakTightnessCheckById,
  createLeakTightnessCheck,
  updateLeakTightnessCheck,
  deleteLeakTightnessCheck,
  fetchBottleVolumeChecks,
  fetchBottleVolumeCheckById,
  createBottleVolumeCheck,
  fetchVolumeChecks,
  fetchVolumeCheckById,
  createVolumeCheck,
  updateVolumeCheck,
  addVolumeCheckImages,
  deleteVolumeCheckImage,
  deleteVolumeCheck,
  fetchSprayDoseChecks,
  fetchSprayDoseCheckById,
  createSprayDoseCheck,
  fetchHardnessChecks,
  fetchHardnessCheckById,
  createHardnessCheck,
  updateHardnessCheck,
  deleteHardnessCheck,
  fetchTabletThicknessChecks,
  fetchTabletThicknessCheckById,
  createTabletThicknessCheck,
  updateTabletThicknessCheck,
  deleteTabletThicknessCheck,
  fetchSemiFinishedGrossWeightChecks,
  fetchSemiFinishedGrossWeightCheckById,
  createSemiFinishedGrossWeightCheck,
  updateSemiFinishedGrossWeightCheck,
  deleteSemiFinishedGrossWeightCheck,
  fetchSemiFinishedNetWeightChecks,
  fetchSemiFinishedNetWeightCheckById,
  createSemiFinishedNetWeightCheck,
  updateSemiFinishedNetWeightCheck,
  deleteSemiFinishedNetWeightCheck,
  fetchShellWeightChecks,
  fetchShellWeightCheckById,
  createShellWeightCheck,
  updateShellWeightCheck,
  deleteShellWeightCheck,
  fetchTenShellWeightCheck,
  fetchTenShellWeightCheckById,
  upsertTenShellWeightCheck,
  updateTenShellWeightCheck,
  deleteTenShellWeightCheck,
  fetchDateChecks,
  fetchDateCheckById,
  createDateCheck,
  updateDateCheck,
  updateDateCheckApproval,
  deleteDateCheck,
  addDateCheckImages,
  deleteDateCheckImage,
  fetchProductionOrderAttachments,
  fetchProductionOrderAttachmentById,
  createProductionOrderAttachment,
  updateProductionOrderAttachment,
  updateProductionOrderAttachmentApproval,
  addProductionOrderAttachmentFiles,
  deleteProductionOrderAttachmentFile,
  deleteProductionOrderAttachment,
  fetchAuthenticatedAsset,
  fetchFinishedProductSummaries,
  fetchFinishedProductSummary,
  fetchFinishedProductSummaryById,
  createFinishedProductSummary,
  updateFinishedProductSummary,
  deleteFinishedProductSummary,
  fetchSemiFinishedProductSummaries,
  fetchSemiFinishedProductSummaryById,
  createSemiFinishedProductSummary,
  updateSemiFinishedProductSummary,
  deleteSemiFinishedProductSummary,
  fetchPostSecondaryPackagingSummaries,
  fetchPostSecondaryPackagingSummaryById,
  createPostSecondaryPackagingSummary,
  updatePostSecondaryPackagingSummary,
  deletePostSecondaryPackagingSummary,
  createPostSecondaryPackagingPendingProcessItem,
  fetchPostSecondaryPackagingPendingProcessItems,
  fetchPostSecondaryPackagingPendingProcessItemById,
  updatePostSecondaryPackagingPendingProcessItem,
  deletePostSecondaryPackagingPendingProcessItem,
  createPostSecondaryPackagingPendingCancellationItem,
  fetchPostSecondaryPackagingPendingCancellationItems,
  fetchPostSecondaryPackagingPendingCancellationItemById,
  updatePostSecondaryPackagingPendingCancellationItem,
  deletePostSecondaryPackagingPendingCancellationItem,
  fetchProductionOrderDocumentControl,
  fetchProductionGuide,
  uploadProductionGuide,
  downloadProductionGuide,
  deleteProductionGuide,
  issueProductionOrderBatchRecord,
  receiveProductionOrderBatchRecord,
  receiveProductionOrderTestCertificate,
  receiveProductionOrderWarehouseRelease,
  fetchMaterialSummaries,
  fetchMaterialSummaryById,
  createMaterialSummary,
  updateMaterialSummary,
  deleteMaterialSummary,
  fetchMaterialProcessSummaries,
  fetchMaterialProcessSummaryById,
  createMaterialProcessSummary,
  updateMaterialProcessSummary,
  deleteMaterialProcessSummary,
  fetchSamplingRecords,
  fetchSamplingRecordById,
  createSamplingRecord,
  updateSamplingRecord,
  deleteSamplingRecord,
  fetchDisinfectantPreparations,
  fetchDisinfectantPreparationById,
  createDisinfectantPreparation,
  updateDisinfectantPreparation,
  deleteDisinfectantPreparation,
  fetchFactoryReleaseReviews,
  fetchFactoryReleaseReviewById,
  createFactoryReleaseReview,
  updateFactoryReleaseReview,
  deleteFactoryReleaseReview,
  fetchCylinderCalibration,
  upsertCylinderCalibration,
  updateCylinderCalibration,
  deleteCylinderCalibration,
  exportWarehouseRelease,
  exportWeighingTicket,
  exportPostWeighingMaterialCheck,
  exportProductionOrder,
};

export default productOrdersService;
