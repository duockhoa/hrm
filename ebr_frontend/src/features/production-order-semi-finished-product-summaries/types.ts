type SemiFinishedProductSummaryUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderSemiFinishedProductSummary = {
  id?: number | string;
  production_order_id?: number | string | null;
  stage?: string | null;
  input_quantity?: string | number | null;
  input_unit?: string | null;
  load_quantity?: string | number | null;
  load_unit?: string | null;
  packed_quantity?: string | number | null;
  packed_unit?: string | null;
  leftover_quantity?: string | number | null;
  leftover_unit?: string | null;
  waste_quantity?: string | number | null;
  waste_unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SemiFinishedProductSummaryUser | null;
};

type SemiFinishedProductSummaryPayload = {
  stage?: string | null;
  input_quantity?: string | number | null;
  input_unit?: string | null;
  load_quantity?: string | number | null;
  load_unit?: string | null;
  packed_quantity?: string | number | null;
  packed_unit?: string | null;
  leftover_quantity?: string | number | null;
  leftover_unit?: string | null;
  waste_quantity?: string | number | null;
  waste_unit?: string | null;
};

export type {
  ProductionOrderSemiFinishedProductSummary,
  SemiFinishedProductSummaryPayload,
  SemiFinishedProductSummaryUser,
};
