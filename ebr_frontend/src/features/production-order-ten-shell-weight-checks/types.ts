type TenShellWeightCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderTenShellWeightCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  ten_shells_weight?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: TenShellWeightCheckUser | null;
};

type TenShellWeightCheckPayload = {
  ten_shells_weight: string;
};

export type {
  ProductionOrderTenShellWeightCheck,
  TenShellWeightCheckPayload,
  TenShellWeightCheckUser,
};
