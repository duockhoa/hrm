export type WeighingRecordPerson = {
  id: number;
  username: string;
  name?: string | null;
};

export type ProductionOrderWeighingRecord = {
  id: number;
  production_order_id: number;
  record_code: string;
  description: string | null;
  status: "draft" | "in_progress" | "completed" | "approved" | "cancelled";
  created_by_id: number;
  createdBy: WeighingRecordPerson;
  qa_staff_approved_by_id: number | null;
  qaStaffApprovedBy: WeighingRecordPerson | null;
  qa_staff_approved_at: string | null;
  ipc_staff_approved_by_id: number | null;
  ipcStaffApprovedBy: WeighingRecordPerson | null;
  ipc_staff_approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProductionOrderWeighingRecordPayload = {
  record_code?: string;
  description?: string | null;
};
