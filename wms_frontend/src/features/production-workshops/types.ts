export type ProductionWorkshop = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type CreateProductionWorkshopPayload = {
  code: string;
  name: string;
  description?: string;
  address?: string;
};

export type UpdateProductionWorkshopPayload = Partial<{
  name: string;
  description: string;
  address: string;
}>;
