export type FeatureKind = "action" | "section" | "view" | string;

export type Feature = {
  id: number;
  key: string;
  kind: FeatureKind;
  label: string;
  group_name: string | null;
  default_order: number;
  created_at?: string;
  updated_at?: string;
};

export type CreateFeaturePayload = {
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  default_order: number;
};

export type UpdateFeaturePayload = Partial<CreateFeaturePayload>;

export type ItemFeatureConfigEntry = {
  feature_id: number;
  key: string;
  kind: string;
  label: string;
  group_name: string | null;
  order: number;
  enabled: boolean;
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
  order: number;
};

export type UpdateItemFeaturePayload = {
  enabled: boolean;
  order: number;
};
