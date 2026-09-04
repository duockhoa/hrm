export type PressureDifferentialConclusion = "dat" | "khong_dat";

export type ProductionWorkshopPressureDifferentialUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export type ProductionWorkshopPressureDifferential = {
  id: number;
  production_workshop_id?: number;
  gauge_name: string;
  differential_pressure: number;
  unit?: string | null;
  conclusion: PressureDifferentialConclusion;
  checked_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by_id?: number | null;
  createdBy?: ProductionWorkshopPressureDifferentialUser | null;
};

export type CreateProductionWorkshopPressureDifferentialPayload = {
  gauge_name: string;
  differential_pressure: number;
  conclusion: PressureDifferentialConclusion;
};

export type UpdateProductionWorkshopPressureDifferentialPayload = Partial<
  CreateProductionWorkshopPressureDifferentialPayload
>;
