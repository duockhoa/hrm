export type ProductLine = {
  id: number;
  code: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type CreateProductLinePayload = {
  code?: string;
  name: string;
};

export type UpdateProductLinePayload = {
  code?: string | null;
  name?: string;
};
