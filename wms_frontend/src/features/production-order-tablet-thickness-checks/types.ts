type TabletThicknessCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
};

type TabletThicknessKey =
  | "unit_1_thickness"
  | "unit_2_thickness"
  | "unit_3_thickness"
  | "unit_4_thickness"
  | "unit_5_thickness"
  | "unit_6_thickness"
  | "unit_7_thickness"
  | "unit_8_thickness"
  | "unit_9_thickness"
  | "unit_10_thickness";

type ProductionOrderTabletThicknessCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: TabletThicknessCheckUser | null;
} & Partial<Record<TabletThicknessKey, string | number | null>>;

type CreateTabletThicknessCheckPayload = {
  requirement?: string | null;
  dosage_form_stage?: string | null;
  unit_1_thickness: string;
  unit?: string | null;
} & Partial<Record<Exclude<TabletThicknessKey, "unit_1_thickness">, string>>;

type UpdateTabletThicknessCheckPayload = Partial<{
  requirement: string | null;
  dosage_form_stage: string | null;
  unit_1_thickness: string;
  unit: string;
} & Record<Exclude<TabletThicknessKey, "unit_1_thickness">, string | null>>;

export type {
  CreateTabletThicknessCheckPayload,
  ProductionOrderTabletThicknessCheck,
  TabletThicknessCheckUser,
  TabletThicknessKey,
  UpdateTabletThicknessCheckPayload,
};
