type VialInspectionCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderVialInspectionCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  bag_number?: number | string | null;
  fiber_vial_count?: number | string | null;
  particulate_count?: number | string | null;
  damaged_count?: number | string | null;
  other_defect_count?: number | string | null;
  note?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: VialInspectionCheckUser | null;
};

type VialInspectionCheckPayload = {
  bag_number: number;
  fiber_vial_count: number;
  particulate_count: number;
  damaged_count: number;
  other_defect_count: number;
  note?: string | null;
};

export type {
  ProductionOrderVialInspectionCheck,
  VialInspectionCheckPayload,
  VialInspectionCheckUser,
};
