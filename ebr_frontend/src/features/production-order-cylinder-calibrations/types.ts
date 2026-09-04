export type CylinderCalibrationUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

export type ProductionOrderCylinderCalibration = {
  id?: number | string;
  production_order_id?: number | string | null;
  cylinder_code?: string | null;
  calibration_number?: string | number | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: CylinderCalibrationUser | null;
};
