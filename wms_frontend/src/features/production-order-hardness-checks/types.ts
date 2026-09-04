type HardnessCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type HardnessKey =
  | "unit_1_hardness"
  | "unit_2_hardness"
  | "unit_3_hardness"
  | "unit_4_hardness"
  | "unit_5_hardness"
  | "unit_6_hardness"
  | "unit_7_hardness"
  | "unit_8_hardness"
  | "unit_9_hardness"
  | "unit_10_hardness";

type ProductionOrderHardnessCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_hardness?: number | string | null;
  unit_2_hardness?: number | string | null;
  unit_3_hardness?: number | string | null;
  unit_4_hardness?: number | string | null;
  unit_5_hardness?: number | string | null;
  unit_6_hardness?: number | string | null;
  unit_7_hardness?: number | string | null;
  unit_8_hardness?: number | string | null;
  unit_9_hardness?: number | string | null;
  unit_10_hardness?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: HardnessCheckUser | null;
};

type CreateHardnessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_hardness: string;
  unit?: string | null;
} & Partial<Record<Exclude<HardnessKey, "unit_1_hardness">, string>>;

type UpdateHardnessCheckPayload = Partial<{
  requirement: string | null;
  dosage_form_stage: string | null;
  unit_1_hardness: string;
  unit: string;
} & Record<Exclude<HardnessKey, "unit_1_hardness">, string | null>>;

export type {
  CreateHardnessCheckPayload,
  HardnessCheckUser,
  HardnessKey,
  ProductionOrderHardnessCheck,
  UpdateHardnessCheckPayload,
};
