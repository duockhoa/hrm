import type { ProductionWorkshop } from "@/features/production-workshops/types";

export type ProductionWorkshopCleaningChecklistUser = {
  id: number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export type ProductionWorkshopCleaningChecklist = {
  id: number;
  production_workshop_id?: number;
  workshop_id?: number;
  subject: string;
  category: string;
  requirement: string;
  result: string;
  note?: string | null;
  cleaned_by_id: number;
  created_at?: string;
  updated_at?: string;
  workshop?: ProductionWorkshop | null;
  cleanedBy?: ProductionWorkshopCleaningChecklistUser | null;
};

export type CreateProductionWorkshopCleaningChecklistPayload = {
  subject: string;
  category: string;
  requirement: string;
  result: string;
  note?: string | null;
  cleaned_by_id: number;
};

export type UpdateProductionWorkshopCleaningChecklistPayload = Partial<
  CreateProductionWorkshopCleaningChecklistPayload
>;
