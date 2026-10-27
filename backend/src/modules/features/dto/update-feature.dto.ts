export class UpdateFeatureDto {
  action_ids?: number[];
  key?: string;
  kind?: string;
  label?: string;
  group_name?: string | null;
  default_order?: number | string | null;
}
