export type FiltrationCheckUser = {
  id: number;
  username?: string | null;
  name?: string | null;
};

export type FiltrationCheck = {
  id: number | string;
  production_order_id?: number | string | null;
  filter_position?: string | null;
  filter_membrane_id?: number | null;
  pre_filter_appearance_requirement?: string | null;
  pre_filter_appearance_result?: string | null;
  pre_sterilization_integrity_requirement?: string | null;
  pre_sterilization_integrity_result?: string | null;
  sterilized_by_id?: number | null;
  rinse_water_volume_liters?: number | string | null;
  filtering_started_at?: string | null;
  filtering_finished_at?: string | null;
  filtered_by_id?: number | null;
  tank_residual_volume_liters?: number | string | null;
  post_filter_integrity_requirement?: string | null;
  post_filter_integrity_result?: string | null;
  post_filter_membrane_appearance_requirement?: string | null;
  post_filter_membrane_appearance_result?: string | null;
  inspected_after_filter_by_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  filterMembrane?: {
    id: number;
    filter_code?: string | null;
    filter_type?: string | null;
  } | null;
  productionOrder?: {
    id: number;
    item_code?: string | null;
    item?: {
      item_name?: string | null;
    } | null;
  } | null;
  sterilizedBy?: FiltrationCheckUser | null;
  filteredBy?: FiltrationCheckUser | null;
  inspectedAfterFilterBy?: FiltrationCheckUser | null;
};

export type FiltrationCheckPayload = Omit<
  FiltrationCheck,
  | "id"
  | "production_order_id"
  | "created_at"
  | "updated_at"
  | "filterMembrane"
  | "productionOrder"
  | "sterilizedBy"
  | "filteredBy"
  | "inspectedAfterFilterBy"
>;
