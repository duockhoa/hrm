import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type LimitOperator = "<" | "<=" | ">" | ">=";

export type ProductionSpecificationPayload = {
  product_line_id?: number | null;
  product_line?: string | null;
  dosage_form_id?: number | null;
  lower_control_limit?: string | null;
  lower_control_limit_operator?: LimitOperator | null;
  upper_control_limit?: string | null;
  upper_control_limit_operator?: LimitOperator | null;
  lower_allowed_limit?: string | null;
  lower_allowed_limit_operator?: LimitOperator | null;
  upper_allowed_limit?: string | null;
  upper_allowed_limit_operator?: LimitOperator | null;
  unit?: string | null;
  spray_dose_lower_allowed_limit?: string | null;
  spray_dose_upper_allowed_limit?: string | null;
  spray_dose_lower_control_limit?: string | null;
  spray_dose_upper_control_limit?: string | null;
  film_coated_tablet_weight_lower_control_limit?: string | null;
  film_coated_tablet_weight_upper_control_limit?: string | null;
  film_coated_tablet_weight_lower_allowed_limit?: string | null;
  film_coated_tablet_weight_upper_allowed_limit?: string | null;
  film_coated_tablet_weight_unit?: string | null;
  hardness_lower_control_limit?: string | null;
  hardness_upper_control_limit?: string | null;
  hardness_lower_allowed_limit?: string | null;
  hardness_upper_allowed_limit?: string | null;
  hardness_unit?: string | null;
  tablet_thickness_control_limit?: string | null;
  tablet_thickness_allowed_limit?: string | null;
  tablet_thickness_unit?: string | null;
  disintegration_time_control_limit?: string | null;
  disintegration_time_allowed_limit?: string | null;
  disintegration_time_unit?: string | null;
};

export type ProductionSpecification = Omit<
  ProductionSpecificationPayload,
  "dosage_form_id"
> & {
  item_code: string;
  dosage_form_id: number | null;
  leak_tightness_requirement?: string | number | null;
  leak_tightness?: string | number | null;
  dosageForm?: {
    id: number;
    name: string;
    sensory_requirement?: string | null;
  } | null;
  productLine?: {
    id: number;
    code?: string | null;
    name: string;
  } | null;
  updated_by_id?: number | null;
  updatedBy?: {
    id: number;
    username?: string | null;
    name?: string | null;
    email?: string | null;
    department?: string | null;
    position?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

const fetchProductionSpecifications = async (): Promise<
  ProductionSpecification[]
> => {
  const response = await axiosClient.get(API_ROUTES.productionSpecifications.base);
  return response.data;
};

const fetchProductionSpecificationByItemCode = async (
  itemCode: string,
): Promise<ProductionSpecification> => {
  const response = await axiosClient.get(
    `${API_ROUTES.productionSpecifications.base}/${itemCode}`,
  );
  return response.data;
};

const createProductionSpecification = async (
  payload: ProductionSpecificationPayload & { item_code: string },
): Promise<ProductionSpecification> => {
  const response = await axiosClient.post(
    API_ROUTES.productionSpecifications.base,
    payload,
  );
  return response.data;
};

const updateProductionSpecification = async (
  itemCode: string,
  payload: ProductionSpecificationPayload,
): Promise<ProductionSpecification> => {
  const response = await axiosClient.put(
    `${API_ROUTES.productionSpecifications.base}/${itemCode}`,
    payload,
  );
  return response.data;
};

const deleteProductionSpecification = async (itemCode: string) => {
  const response = await axiosClient.delete(
    `${API_ROUTES.productionSpecifications.base}/${itemCode}`,
  );
  return response.data;
};

const productionSpecificationsService = {
  fetchProductionSpecifications,
  fetchProductionSpecificationByItemCode,
  createProductionSpecification,
  updateProductionSpecification,
  deleteProductionSpecification,
};

export default productionSpecificationsService;
