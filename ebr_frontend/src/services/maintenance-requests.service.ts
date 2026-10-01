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
  equipment?: { code: string; name: string } | null;
  title: string;
  description: string;
  priority: Priority;
  createdAt: string;
  status: string;
  reporterName?: string | null;
  department?: string | null;
  reporter?: {
    name: string | null;
    department?: string | null;
  } | null;
  workOrders?: { id: string }[];
};
export type MaintenanceEquipment = {
  id: string;
  code: string;
  name: string;
  accountingCode?: string | null;
  category?: string | null;
  department?: string | null;
  location?: string | null;
  status?: string;
  serialNumber?: string | null;
};

export type MaintenanceWorkOrder = {
  id: string;
  orderCode: string;
  title: string;
  description?: string | null;
  status: string;
  priority: Priority;
  technicianName?: string | null;
  createdAt: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  failureCause?: string | null;
  solution?: string | null;
};

export type MaintenanceRequestDetail = Omit<
  MaintenanceRequest,
  "equipment" | "workOrders"
> & {
  equipment?: MaintenanceEquipment | null;
  images?: string[] | null;
  rejectedReason?: string | null;
  returnedReason?: string | null;
  cancelledReason?: string | null;
  cancelledAt?: string | null;
  workOrders?: MaintenanceWorkOrder[];
};

const baseURL =
  process.env.NEXT_PUBLIC_QLTB_API_URL || "https://qltb.dkpharma.io.vn/api/v1";
const options = { baseURL };
export const maintenanceRequestsKey = `${baseURL}/requests`;
export const maintenanceRequestKey = (id: string) =>
  `${maintenanceRequestsKey}/${encodeURIComponent(id)}`;
export const maintenanceEquipmentKey = `${baseURL}/equipment`;

export const maintenanceRequestsService = {
  async list(): Promise<MaintenanceRequest[]> {
    const { data } = await axiosClient.get<MaintenanceRequest[]>(
      "/requests",
      options,
    );
    return data;
  },
  async detail(id: string): Promise<MaintenanceRequestDetail> {
    const { data } = await axiosClient.get<MaintenanceRequestDetail>(
      `/requests/${encodeURIComponent(id)}`,
      options,
    );
    return data;
  },
  async listEquipment(): Promise<MaintenanceEquipment[]> {
    const { data } = await axiosClient.get<
      MaintenanceEquipment[] | { data: MaintenanceEquipment[] }
    >("/equipment", options);

    return Array.isArray(data) ? data : data.data;
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
      const { data: response } = await axiosClient.get<
        MaintenanceEquipment[] | { data: MaintenanceEquipment[] }
      >("/equipment", {
        ...options,
        params: { search: input.equipmentCode },
      });
      const equipmentList = Array.isArray(response) ? response : response.data;
      const equipment = equipmentList.find(
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
