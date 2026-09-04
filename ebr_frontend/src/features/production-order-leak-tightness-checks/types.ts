type LeakTightnessCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type LeakTightnessCheckKey =
  | "unit_1_result"
  | "unit_2_result"
  | "unit_3_result"
  | "unit_4_result"
  | "unit_5_result"
  | "unit_6_result"
  | "unit_7_result"
  | "unit_8_result"
  | "unit_9_result"
  | "unit_10_result";

type ProductionOrderLeakTightnessCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_result?: boolean | null;
  unit_2_result?: boolean | null;
  unit_3_result?: boolean | null;
  unit_4_result?: boolean | null;
  unit_5_result?: boolean | null;
  unit_6_result?: boolean | null;
  unit_7_result?: boolean | null;
  unit_8_result?: boolean | null;
  unit_9_result?: boolean | null;
  unit_10_result?: boolean | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: LeakTightnessCheckUser | null;
};

type CreateLeakTightnessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_result: boolean;
} & Partial<Record<Exclude<LeakTightnessCheckKey, "unit_1_result">, boolean | null>>;

type UpdateLeakTightnessCheckPayload = Partial<{
  requirement: string | null;
  dosage_form_stage: string | null;
  unit_1_result: boolean;
} & Record<Exclude<LeakTightnessCheckKey, "unit_1_result">, boolean | null>>;

export type {
  CreateLeakTightnessCheckPayload,
  LeakTightnessCheckKey,
  LeakTightnessCheckUser,
  ProductionOrderLeakTightnessCheck,
  UpdateLeakTightnessCheckPayload,
};
