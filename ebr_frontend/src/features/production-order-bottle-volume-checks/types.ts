type BottleVolumeCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type BottleVolumeKey =
  | "bottle_1_volume"
  | "bottle_2_volume"
  | "bottle_3_volume"
  | "bottle_4_volume"
  | "bottle_5_volume"
  | "bottle_6_volume";

type ProductionOrderBottleVolumeCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  bottle_1_volume?: number | string | null;
  bottle_2_volume?: number | string | null;
  bottle_3_volume?: number | string | null;
  bottle_4_volume?: number | string | null;
  bottle_5_volume?: number | string | null;
  bottle_6_volume?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: BottleVolumeCheckUser | null;
};

type BottleVolumeCheckPayload = Partial<Record<BottleVolumeKey, string>>;

export type {
  BottleVolumeCheckPayload,
  BottleVolumeCheckUser,
  BottleVolumeKey,
  ProductionOrderBottleVolumeCheck,
};
