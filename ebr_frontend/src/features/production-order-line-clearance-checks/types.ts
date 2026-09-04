type LineClearanceCheckUser = {
  id?: string | number;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  employee_code?: string | null;
};

type PreviousProductionOrder = {
  id?: string | number;
  lot_no?: string | null;
  item_code?: string | null;
  item_name?: string | null;
  description?: string | null;
  item?: {
    item_name?: string | null;
  } | null;
};

type ProductionOrderLineClearanceCheck = {
  id?: string | number;
  production_order_id?: string | number | null;
  check_type?: string | null;
  requirement?: string | null;
  result?: "Đạt" | "Không đạt" | string | null;
  previous_production_order_id?: string | number | null;
  previous_lot_no?: string | null;
  created_by_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: LineClearanceCheckUser | null;
  previousProductionOrder?: PreviousProductionOrder | null;
  previous_production_order?: PreviousProductionOrder | null;
};

type LineClearanceCheckPayload = {
  check_type: string;
  requirement: string;
  result: "Đạt" | "Không đạt";
  previous_production_order_id?: number | null;
  previous_lot_no?: string | null;
};

export type {
  LineClearanceCheckPayload,
  LineClearanceCheckUser,
  PreviousProductionOrder,
  ProductionOrderLineClearanceCheck,
};
