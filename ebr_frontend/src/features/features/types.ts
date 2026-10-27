export type FeatureKind = "action" | "section" | "view" | string;

export type FeatureReference = {
  id: number;
  key: string;
  label: string;
  order?: number;
};

export type Feature = {
  id: number;
  key: string;
  kind: FeatureKind;
  label: string;
  group_name: string | null;
  default_order: number;
  supports_required?: boolean;
  source_actions?: FeatureReference[];
  target_sections?: FeatureReference[];
  created_at?: string;
  updated_at?: string;
};

export type CreateFeaturePayload = {
  action_ids?: number[];
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  default_order: number;
};

export type UpdateFeaturePayload = Partial<CreateFeaturePayload>;

export type ItemFeatureConfigEntry = {
  source_actions?: FeatureReference[];
  feature_id: number;
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  order: number;
  enabled: boolean;
  required: boolean;
};

export type ItemFeatureConfig = {
  item_code: string;
  actions: ItemFeatureConfigEntry[];
  sections: ItemFeatureConfigEntry[];
  features: ItemFeatureConfigEntry[];
};

export type UpsertItemFeaturePayload = {
  feature_id?: number;
  feature_key?: string;
  enabled: boolean;
  required?: boolean;
  order: number;
};

export type UpdateItemFeaturePayload = {
  enabled: boolean;
  required?: boolean;
  order: number;
};
