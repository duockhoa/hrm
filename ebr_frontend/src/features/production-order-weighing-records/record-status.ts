import type { ProductionOrderWeighingRecord } from "./types";

export const weighingRecordStatusLabel = (
  record: Pick<
    ProductionOrderWeighingRecord,
    "qa_staff_approved_at" | "ipc_staff_approved_at"
  >,
) => {
  if (record.ipc_staff_approved_at) return "Hoàn thành";
  if (record.qa_staff_approved_at) return "ĐBCL duyệt";
  return "Khởi tạo";
};
