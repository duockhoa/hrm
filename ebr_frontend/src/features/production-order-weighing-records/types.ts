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
export type ProductionOrderWeighingRecordLine = {
  id: number;
  production_order_weighing_record_id: number;
  source_line_number: number | null;
  source_stage_id: number | null;
  stage_name: string | null;
  item_code: string;
  item_name: string;
  lot_no: string | null;
  planned_quantity: string;
  unit: string;
  note: string | null;
  details?: ProductionOrderWeighingRecordDetail[];
  lotCheck?: WeighingRecordLotCheck | null;
};

export type WeighingRecordLotCheck = {
  id: number;
  production_order_weighing_record_line_id: number;
  is_correct: boolean;
  checked_by_id: number;
  checked_at: string;
};

export type ProductionOrderWeighingRecordDetail = {
  id: number;
  production_order_weighing_record_line_id: number;
  net_weight: string;
  unit: string;
  image_path: string | null;
  images?: { id: number; image_path: string; created_at: string }[];
  weighed_by_id: number;
  weighedBy: WeighingRecordPerson;
  weighed_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type WeighingImportStage = {
  id: number;
  name: string;
  material_count: number;
  imported: boolean;
};

export type WeighingSourceMaterial = Omit<
  ProductionOrderWeighingRecordLine,
  "id" | "production_order_weighing_record_id" | "details"
> & { imported: boolean };

export type UpdateWeighingRecordLinePayload = Partial<
  Pick<
    ProductionOrderWeighingRecordLine,
    "item_code" | "item_name" | "lot_no" | "planned_quantity" | "unit" | "note"
  >
>;
