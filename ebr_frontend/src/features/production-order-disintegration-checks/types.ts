type DisintegrationCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderDisintegrationCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_passed?: boolean | null;
  unit_2_passed?: boolean | null;
  unit_3_passed?: boolean | null;
  unit_4_passed?: boolean | null;
  unit_5_passed?: boolean | null;
  unit_6_passed?: boolean | null;
  created_by_id?: number | string | null;
  checked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: DisintegrationCheckUser | null;
};

type DisintegrationCheckPayload = {
  requirement?: string | null;
  dosage_form_stage: string;
  unit_1_passed: boolean;
  unit_2_passed?: boolean | null;
  unit_3_passed?: boolean | null;
  unit_4_passed?: boolean | null;
  unit_5_passed?: boolean | null;
  unit_6_passed?: boolean | null;
};

export type {
  DisintegrationCheckPayload,
  DisintegrationCheckUser,
  ProductionOrderDisintegrationCheck,
};
