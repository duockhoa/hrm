type FriabilityCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderFriabilityCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  total_weight_before_check?: string | number | null;
  total_weight_after_check?: string | number | null;
  weight_unit?: string | null;
  friability_percent?: string | number | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: FriabilityCheckUser | null;
};

type FriabilityCheckPayload = {
  total_weight_before_check: string | number;
  total_weight_after_check: string | number;
};

export type {
  FriabilityCheckPayload,
  FriabilityCheckUser,
  ProductionOrderFriabilityCheck,
};
