export class CreateProductionOrderFiltrationCheckDto {
  filter_position?: string | null;
  filter_membrane_id?: number | string | null;
  pre_filter_appearance_requirement?: string | null;
  pre_filter_appearance_result?: string | null;
  pre_sterilization_integrity_requirement?: string | null;
  pre_sterilization_integrity_result?: string | null;
  sterilized_by_id?: number | string | null;
  rinse_water_volume_liters?: number | string | null;
  filtering_started_at?: string | Date | null;
  filtering_finished_at?: string | Date | null;
  filtered_by_id?: number | string | null;
  tank_residual_volume_liters?: number | string | null;
  post_filter_test_requirement?: string | null;
  post_filter_test_result?: string | null;
  post_filter_membrane_appearance_requirement?: string | null;
  post_filter_membrane_appearance_result?: string | null;
  inspected_after_filter_by_id?: number | string | null;
}
