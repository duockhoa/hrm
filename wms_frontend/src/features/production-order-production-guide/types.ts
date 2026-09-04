type ProductionOrderProductionGuide = {
  id: string | number;
  production_order_id: string | number;
  original_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type { ProductionOrderProductionGuide };
