export class UpdateProductionSpecificationDto {
  product_line_id?: number | string | null;
  productLineId?: number | string | null;
  product_line?: string | null;
  dosage_form?: string | null;
  lower_control_limit?: string | number | null;
  upper_control_limit?: string | number | null;
  lower_allowed_limit?: string | number | null;
  upper_allowed_limit?: string | number | null;
  unit?: string | null;
  spray_dose_lower_allowed_limit?: string | number | null;
  spray_dose_upper_allowed_limit?: string | number | null;
  spray_dose_lower_control_limit?: string | number | null;
  spray_dose_upper_control_limit?: string | number | null;
  film_coated_tablet_weight_lower_control_limit?: string | number | null;
  film_coated_tablet_weight_upper_control_limit?: string | number | null;
  film_coated_tablet_weight_lower_allowed_limit?: string | number | null;
  film_coated_tablet_weight_upper_allowed_limit?: string | number | null;
  film_coated_tablet_weight_unit?: string | null;
}
