export type Item = {
  item_code: string;
  item_name: string | null;
  dk_code?: string | null;
  unit: string | null;
  registration?: {
    registration_number?: string | null;
    product_name?: string | null;
  } | null;
};
