import type {
  Manufacturer,
  ManufacturerPayload,
} from "@/features/manufacturers/types";
import { API_ROUTES } from "@/lib/api-routes";
import axiosClient from "@/lib/axios-client";

const manufacturersService = {
  async fetchAll(): Promise<Manufacturer[]> {
    return (
      await axiosClient.get<Manufacturer[]>(API_ROUTES.manufacturers.base)
    ).data;
  },
  async fetchById(id: number): Promise<Manufacturer> {
    return (
      await axiosClient.get<Manufacturer>(API_ROUTES.manufacturers.detail(id))
    ).data;
  },
  async create(payload: ManufacturerPayload): Promise<Manufacturer> {
    return (
      await axiosClient.post<Manufacturer>(
        API_ROUTES.manufacturers.base,
        payload,
      )
    ).data;
  },
  async update(
    id: number,
    payload: ManufacturerPayload,
  ): Promise<Manufacturer> {
    return (
      await axiosClient.patch<Manufacturer>(
        API_ROUTES.manufacturers.detail(id),
        payload,
      )
    ).data;
  },
  async delete(id: number): Promise<Manufacturer> {
    return (
      await axiosClient.delete<Manufacturer>(
        API_ROUTES.manufacturers.detail(id),
      )
    ).data;
  },
};

export default manufacturersService;
