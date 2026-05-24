export class CreateProductionSpecificationDto {
  item_code!: string;
  product_line?: string | null;
  dosage_form?: string | null;
  lower_control_limit?: string | number | null;
  upper_control_limit?: string | number | null;
  lower_allowed_limit?: string | number | null;
  upper_allowed_limit?: string | number | null;
  unit?: string | null;
}
