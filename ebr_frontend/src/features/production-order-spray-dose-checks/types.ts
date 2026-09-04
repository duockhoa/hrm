type SprayDoseCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type SprayDoseKey =
  | "bottle_1_spray_dose_count"
  | "bottle_2_spray_dose_count"
  | "bottle_3_spray_dose_count"
  | "bottle_4_spray_dose_count"
  | "bottle_5_spray_dose_count"
  | "bottle_6_spray_dose_count";

type ProductionOrderSprayDoseCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  bottle_1_spray_dose_count?: number | string | null;
  bottle_2_spray_dose_count?: number | string | null;
  bottle_3_spray_dose_count?: number | string | null;
  bottle_4_spray_dose_count?: number | string | null;
  bottle_5_spray_dose_count?: number | string | null;
  bottle_6_spray_dose_count?: number | string | null;
  unit?: string | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SprayDoseCheckUser | null;
};

type SprayDoseCheckPayload = {
  requirement?: string | null;
  unit?: string;
  bottle_1_spray_dose_count: string;
  bottle_2_spray_dose_count?: string | null;
  bottle_3_spray_dose_count?: string | null;
  bottle_4_spray_dose_count?: string | null;
  bottle_5_spray_dose_count?: string | null;
  bottle_6_spray_dose_count?: string | null;
};

export type {
  ProductionOrderSprayDoseCheck,
  SprayDoseCheckPayload,
  SprayDoseCheckUser,
  SprayDoseKey,
};
