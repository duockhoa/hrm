import axiosClient from "@/lib/axios-client";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MaintenanceRequestInput = {
  equipmentCode: string;
  title: string;
  description: string;
  priority: Priority;
};
export type MaintenanceRequest = {
  id: string;
  requestCode: string;
  equipmentId: string;
  equipment?: { code: string; name: string };
  title: string;
  description: string;
  priority: Priority;
  createdAt: string;
  status: string;
  workOrders?: { id: string }[];
};

const baseURL =
  process.env.NEXT_PUBLIC_QLTB_API_URL || "https://qltb.dkpharma.io.vn/api/v1";
const options = { baseURL };
export const maintenanceRequestsKey = `${baseURL}/requests`;

export const maintenanceRequestsService = {
  async list(): Promise<MaintenanceRequest[]> {
    const { data } = await axiosClient.get<MaintenanceRequest[]>(
      "/requests",
      options,
    );
    return data;
  },
  async create(input: MaintenanceRequestInput) {
    const { equipmentCode, title, description, priority } = input;
    await axiosClient.post(
      "/requests",
      { equipmentCode, title, description, priority },
      options,
    );
  },
  async update(record: MaintenanceRequest, input: MaintenanceRequestInput) {
    let equipmentId = record.equipmentId;
    if (input.equipmentCode !== record.equipment?.code) {
      type Equipment = { id: string; code: string; accountingCode?: string };
      const { data } = await axiosClient.get<Equipment[]>("/equipment", {
        ...options,
        params: { search: input.equipmentCode },
      });
      const equipment = data.find(
        (item) =>
          item.code === input.equipmentCode ||
          item.accountingCode === input.equipmentCode,
      );
      if (!equipment) {
        throw new Error("Không tìm thấy thiết bị theo mã đã nhập.");
      }
      equipmentId = equipment.id;
    }
    const { title, description, priority } = input;
    await axiosClient.patch(
      `/requests/${encodeURIComponent(record.id)}`,
      { equipmentId, title, description, priority },
      options,
    );
  },
  async remove(id: string) {
    await axiosClient.delete(`/requests/${encodeURIComponent(id)}`, options);
  },
};
