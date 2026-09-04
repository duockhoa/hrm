type MaterialProcessSummaryUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderMaterialProcessSummary = {
  id?: number | string;
  production_order_id?: number | string | null;
  process_stage?: string | null;
  yielded_quantity?: string | number | null;
  yielded_unit?: string | null;
  moisture_percent?: string | number | null;
  image_path?: string | null;
  note?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: MaterialProcessSummaryUser | null;
};

export type {
  MaterialProcessSummaryUser,
  ProductionOrderMaterialProcessSummary,
};
