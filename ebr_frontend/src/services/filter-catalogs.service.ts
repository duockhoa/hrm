import type {
  CreateFilterCatalogPayload,
  FilterCatalog,
  UpdateFilterCatalogPayload,
} from "@/features/filter-catalogs/types";
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const fetchFilterCatalogs = async (
  includeInactive = false,
  search?: string,
): Promise<FilterCatalog[]> => {
  const response = await axiosClient.get(API_ROUTES.filterCatalogs.base, {
    params: { include_inactive: includeInactive || undefined, search },
  });
  return [...response.data].sort((a, b) => b.id - a.id);
};

const fetchFilterCatalogById = async (
  id: string | number,
): Promise<FilterCatalog> => {
  const response = await axiosClient.get(API_ROUTES.filterCatalogs.detail(id));
  return response.data;
};

const createFilterCatalog = async (
  payload: CreateFilterCatalogPayload,
): Promise<FilterCatalog> => {
  const response = await axiosClient.post(
    API_ROUTES.filterCatalogs.base,
    payload,
  );
  return response.data;
};

const updateFilterCatalog = async (
  id: string | number,
  payload: UpdateFilterCatalogPayload,
): Promise<FilterCatalog> => {
  const response = await axiosClient.patch(
    API_ROUTES.filterCatalogs.detail(id),
    payload,
  );
  return response.data;
};

const deleteFilterCatalog = async (id: string | number): Promise<FilterCatalog> => {
  const response = await axiosClient.delete(API_ROUTES.filterCatalogs.detail(id));
  return response.data;
};

const filterCatalogsService = {
  fetchFilterCatalogs: () => fetchFilterCatalogs(),
  fetchIncludingInactive: () => fetchFilterCatalogs(true),
  searchIncludingInactive: (search: string) => fetchFilterCatalogs(true, search),
  fetchFilterCatalogById,
  createFilterCatalog,
  updateFilterCatalog,
  deleteFilterCatalog,
};

export default filterCatalogsService;
