type SemiFinishedGrossWeightCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type SemiFinishedGrossWeightKey =
  | "unit_1_gross_weight"
  | "unit_2_gross_weight"
  | "unit_3_gross_weight"
  | "unit_4_gross_weight"
  | "unit_5_gross_weight"
  | "unit_6_gross_weight"
  | "unit_7_gross_weight"
  | "unit_8_gross_weight"
  | "unit_9_gross_weight"
  | "unit_10_gross_weight";

type ProductionOrderSemiFinishedGrossWeightCheck = {
  lower_limit?: number | string | null;
  upper_limit?: number | string | null;
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_gross_weight?: number | string | null;
  unit_2_gross_weight?: number | string | null;
  unit_3_gross_weight?: number | string | null;
  unit_4_gross_weight?: number | string | null;
  unit_5_gross_weight?: number | string | null;
  unit_6_gross_weight?: number | string | null;
  unit_7_gross_weight?: number | string | null;
  unit_8_gross_weight?: number | string | null;
  unit_9_gross_weight?: number | string | null;
  unit_10_gross_weight?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SemiFinishedGrossWeightCheckUser | null;
};

type CreateSemiFinishedGrossWeightCheckPayload = {
  lower_limit?: number | null;
  upper_limit?: number | null;
  requirement?: string;
  dosage_form_stage?: string;
  unit_1_gross_weight: string;
  unit?: string;
} & Partial<
  Record<Exclude<SemiFinishedGrossWeightKey, "unit_1_gross_weight">, string>
>;

type UpdateSemiFinishedGrossWeightCheckPayload = Partial<{
  lower_limit: number | null;
  upper_limit: number | null;
  requirement: string;
  dosage_form_stage: string | null;
  unit_1_gross_weight: string;
  unit: string;
} & Record<
  Exclude<SemiFinishedGrossWeightKey, "unit_1_gross_weight">,
  string | null
>>;

export type {
  CreateSemiFinishedGrossWeightCheckPayload,
  ProductionOrderSemiFinishedGrossWeightCheck,
  SemiFinishedGrossWeightCheckUser,
  SemiFinishedGrossWeightKey,
  UpdateSemiFinishedGrossWeightCheckPayload,
};
