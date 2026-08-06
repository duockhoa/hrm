export class CreateFilterCatalogDto {
  filter_code?: string | null;
  filter_type?: string | null;
  usable_steam_cycles?: number | string | null;
  sensory_requirement?: string | null;
  integrity_requirement?: string | null;
  description?: string | null;
}
