export type WeighingRecordPerson = {
  id: number;
  username: string;
  name?: string | null;
};

export type ProductionOrderWeighingRecord = {
  id: number;
  production_order_id: number;
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
  description?: string | null;
};
export type WeighingProductionOrder = {
  id?: string | number;
  production_order_id?: string | number;
  DocumentAbsoluteEntry?: string | number;
  item_code?: string;
  item_name?: string;
  item?: { item_code?: string; item_name?: string; unit?: string | null };
  lot_no?: string;
  lot_number?: string;
  batch_number?: string;
  planned_quatity?: number | string | null;
  planned_quantity?: number | string | null;
  PlannedQuantity?: number | string | null;
  unit?: string | null;
};
