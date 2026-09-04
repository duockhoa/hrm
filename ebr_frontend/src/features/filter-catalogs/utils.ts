import type { FilterCatalog } from "./types";

const usageCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export const getRemainingFilterCatalogUsageCount = (
  filterCatalog: FilterCatalog,
) => {
  const allowedCycles = filterCatalog.usable_steam_cycles;

  if (typeof allowedCycles !== "number" || !Number.isFinite(allowedCycles)) {
    return null;
  }

  return Math.max(
    0,
    allowedCycles - usageCount(filterCatalog.production_order_filtration_checks_count),
  );
};

export const isFilterCatalogExpired = (filterCatalog: FilterCatalog) => {
  const remainingUsageCount = getRemainingFilterCatalogUsageCount(filterCatalog);

  return remainingUsageCount !== null && remainingUsageCount === 0;
};

export const isFilterCatalogUsable = (filterCatalog: FilterCatalog) =>
  !isFilterCatalogExpired(filterCatalog);
