type VolumeCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type VolumeKey =
  | "unit_1_volume"
  | "unit_2_volume"
  | "unit_3_volume"
  | "unit_4_volume"
  | "unit_5_volume"
  | "unit_6_volume";

type VolumeCheckImage = {
  id: number | string;
  volume_check_id?: number | string | null;
  image_path: string;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: VolumeCheckUser | null;
};

type ProductionOrderVolumeCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  package_type?: string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_volume?: number | string | null;
  unit_2_volume?: number | string | null;
  unit_3_volume?: number | string | null;
  unit_4_volume?: number | string | null;
  unit_5_volume?: number | string | null;
  unit_6_volume?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: VolumeCheckUser | null;
  images?: VolumeCheckImage[] | null;
};

type VolumeCheckPayload = {
  package_type?: string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit?: string | null;
} & Partial<Record<VolumeKey, string | null>>;

export type {
  ProductionOrderVolumeCheck,
  VolumeCheckImage,
  VolumeCheckPayload,
  VolumeCheckUser,
  VolumeKey,
};
