type SecondaryPackagingCheckUser = {
  id?: string | number;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  employee_code?: string | null;
};

type ProductionOrderSecondaryPackagingCheck = {
  id?: string | number;
  production_order_id?: string | number | null;
  stage?: string | null;
  requirement?: string | null;
  quantity_checked?: number | string | null;
  quantity_passed?: number | string | null;
  checked_by_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  checkedBy?: SecondaryPackagingCheckUser | null;
  createdBy?: SecondaryPackagingCheckUser | null;
};

type SecondaryPackagingCheckPayload = {
  stage: string;
  requirement: string;
  quantity_checked: number;
  quantity_passed: number;
};

export type {
  ProductionOrderSecondaryPackagingCheck,
  SecondaryPackagingCheckPayload,
  SecondaryPackagingCheckUser,
};
