export type FilterCatalog = {
  id: number;
  filter_code: string;
  filter_type: string;
  usable_steam_cycles?: number | null;
  pre_filter_sensory_requirement?: string | null;
  post_filter_sensory_requirement?: string | null;
  integrity_requirement?: string | null;
  description?: string | null;
  production_order_filtration_checks_count?: number;
  created_by_id?: number | null;
  created_at?: string;
  updated_at?: string;
  createdBy?: {
    id?: number;
    username?: string | null;
    name?: string | null;
  } | null;
  productionOrderFiltrationChecks?: FilterCatalogFiltrationCheck[];
};

export type FilterCatalogFiltrationCheck = {
  id: number;
  production_order_id?: number | null;
  created_at?: string | null;
  filter_position?: string | null;
  filtering_started_at?: string | null;
  filtering_finished_at?: string | null;
  pre_sterilization_integrity_result?: string | null;
  post_filter_integrity_result?: string | null;
  productionOrder?: {
    id?: number;
    item_code?: string | null;
    item_name?: string | null;
    description?: string | null;
    production_order_code?: string | null;
    lot_no?: string | null;
    item?: {
      item_name?: string | null;
    } | null;
  } | null;
  sterilizedBy?: { id?: number; name?: string | null; username?: string | null } | null;
  filteredBy?: { id?: number; name?: string | null; username?: string | null } | null;
  inspectedAfterFilterBy?: { id?: number; name?: string | null; username?: string | null } | null;
};

export type CreateFilterCatalogPayload = {
  filter_code: string;
  filter_type: string;
  usable_steam_cycles?: number | null;
  pre_filter_sensory_requirement?: string | null;
  post_filter_sensory_requirement?: string | null;
  integrity_requirement?: string | null;
  description?: string | null;
};

export type UpdateFilterCatalogPayload = Partial<CreateFilterCatalogPayload>;
