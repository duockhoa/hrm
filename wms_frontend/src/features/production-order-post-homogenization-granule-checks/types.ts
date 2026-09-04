type PostHomogenizationGranuleCheckUser = {
  id?: number | string;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderPostHomogenizationGranuleCheck = {
  id?: number | string;
  production_order_id?: number | string | null;
  bulk_density?: string | number | null;
  tapped_density?: string | number | null;
  density_unit?: string | null;
  image_path?: string | null;
  carr_index?: string | number | null;
  moisture_percent?: string | number | null;
  created_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: PostHomogenizationGranuleCheckUser | null;
};

type PostHomogenizationGranuleCheckPayload = {
  bulk_density?: string | number;
  tapped_density?: string | number;
  moisture_percent?: string | number | null;
};

export type {
  PostHomogenizationGranuleCheckPayload,
  PostHomogenizationGranuleCheckUser,
  ProductionOrderPostHomogenizationGranuleCheck,
};
