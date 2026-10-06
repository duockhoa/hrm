import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

const routes = API_ROUTES.warehouseTemperatureHumidityChecks;
export const WAREHOUSE_TEMPERATURE_HUMIDITY_CHECKS_URL = routes.base;

export type WarehouseTemperatureHumidityCheck = {
  id: number;
  location: string;
  requirement: string;
  temperature: string;
  humidity: string;
  is_passed: boolean | null;
  checked_by_id: number;
  created_at: string;
  updated_at: string;
  checkedBy: { id: number; username: string; name: string | null };
};

export type WarehouseTemperatureHumidityCheckPayload = {
  location: string;
  requirement: string;
  temperature: number;
  humidity: number;
};

const warehouseTemperatureHumidityChecksService = {
  async list(): Promise<WarehouseTemperatureHumidityCheck[]> {
    return (await axiosClient.get(routes.base)).data;
  },
  async read(id: number): Promise<WarehouseTemperatureHumidityCheck> {
    return (await axiosClient.get(routes.detail(id))).data;
  },
  async create(
    payload: WarehouseTemperatureHumidityCheckPayload,
  ): Promise<WarehouseTemperatureHumidityCheck> {
    return (await axiosClient.post(routes.base, payload)).data;
  },
  async update(
    id: number,
    payload: Partial<WarehouseTemperatureHumidityCheckPayload>,
  ): Promise<WarehouseTemperatureHumidityCheck> {
    return (await axiosClient.patch(routes.detail(id), payload)).data;
  },
  async delete(id: number): Promise<WarehouseTemperatureHumidityCheck> {
    return (await axiosClient.delete(routes.detail(id))).data;
  },
};

export default warehouseTemperatureHumidityChecksService;
