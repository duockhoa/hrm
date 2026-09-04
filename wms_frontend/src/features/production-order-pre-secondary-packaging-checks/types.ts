type PreSecondaryPackagingCheckUser = {
  id?: string | number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type PreSecondaryPackagingCheckImage = {
  id: string | number;
  check_id?: string | number | null;
  image_path: string;
  created_at?: string | null;
};

type ProductionOrderPreSecondaryPackagingCheck = {
  id: string | number;
  production_order_id?: string | number | null;
  requirement?: string | null;
  quantity_checked?: number | string | null;
  quantity_passed?: number | string | null;
  created_by_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: PreSecondaryPackagingCheckUser | null;
  images?: PreSecondaryPackagingCheckImage[];
};

type PreSecondaryPackagingCheckPayload = {
  requirement: string;
  quantity_checked: number;
  quantity_passed: number;
};

export type {
  PreSecondaryPackagingCheckImage,
  PreSecondaryPackagingCheckPayload,
  PreSecondaryPackagingCheckUser,
  ProductionOrderPreSecondaryPackagingCheck,
};
