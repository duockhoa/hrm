type SemiFinishedNetWeightCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type SemiFinishedNetWeightKey =
  | "unit_1_net_weight"
  | "unit_2_net_weight"
  | "unit_3_net_weight"
  | "unit_4_net_weight"
  | "unit_5_net_weight"
  | "unit_6_net_weight"
  | "unit_7_net_weight"
  | "unit_8_net_weight"
  | "unit_9_net_weight"
  | "unit_10_net_weight";

type ProductionOrderSemiFinishedNetWeightCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_net_weight?: number | string | null;
  unit_2_net_weight?: number | string | null;
  unit_3_net_weight?: number | string | null;
  unit_4_net_weight?: number | string | null;
  unit_5_net_weight?: number | string | null;
  unit_6_net_weight?: number | string | null;
  unit_7_net_weight?: number | string | null;
  unit_8_net_weight?: number | string | null;
  unit_9_net_weight?: number | string | null;
  unit_10_net_weight?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SemiFinishedNetWeightCheckUser | null;
};

type CreateSemiFinishedNetWeightCheckPayload = {
  requirement?: string;
  dosage_form_stage?: string;
  unit_1_net_weight: string;
  unit?: string;
} & Partial<
  Record<Exclude<SemiFinishedNetWeightKey, "unit_1_net_weight">, string>
>;

type UpdateSemiFinishedNetWeightCheckPayload = Partial<{
  requirement: string;
  dosage_form_stage: string;
  unit_1_net_weight: string;
  unit: string;
} & Record<
  Exclude<SemiFinishedNetWeightKey, "unit_1_net_weight">,
  string | null
>>;

export type {
  CreateSemiFinishedNetWeightCheckPayload,
  ProductionOrderSemiFinishedNetWeightCheck,
  SemiFinishedNetWeightCheckUser,
  SemiFinishedNetWeightKey,
  UpdateSemiFinishedNetWeightCheckPayload,
};
