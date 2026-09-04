import type { ProductionWorkshop } from "@/features/production-workshops/types";

type DisinfectantPreparationUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderDisinfectantPreparation = {
  id?: number | string;
  production_order_id?: number | string | null;
  workshop_id?: number | string | null;
  disinfectant_name?: string | null;
  purpose?: string | null;
  base_material_name?: string | null;
  base_material_content?: string | number | null;
  base_material_amount_l?: string | number | null;
  prepared_volume_l?: string | number | null;
  actual_concentration?: string | number | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  workshop?: ProductionWorkshop | null;
  createdBy?: DisinfectantPreparationUser | null;
};

type DisinfectantPreparationPayload = {
  workshop_id: string | number;
  disinfectant_name: string;
  purpose: string;
  base_material_name: string;
  base_material_content: string | number;
  base_material_amount_l: string | number;
  prepared_volume_l: string | number;
  actual_concentration: string | number;
};

export type {
  DisinfectantPreparationPayload,
  DisinfectantPreparationUser,
  ProductionOrderDisinfectantPreparation,
};
