type ProductionOrderAttachmentUser = {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  department?: string | null;
  position?: string | null;
};

type ProductionOrderAttachmentFile = {
  id?: string | number;
  production_order_attachment_id?: string | number | null;
  file_path?: string | null;
  file_name?: string | null;
  filename?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductionOrderAttachment = {
  id?: string | number;
  production_order_id?: string | number | null;
  attachment_type?: string | null;
  description?: string | null;
  requires_approval?: boolean | null;
  approval_status?: "pending" | "approved" | "rejected" | string | null;
  approval_note?: string | null;
  entered_by_id?: string | number | null;
  approved_by_id?: string | number | null;
  entered_at?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  enteredBy?: ProductionOrderAttachmentUser | null;
  approvedBy?: ProductionOrderAttachmentUser | null;
  files?: ProductionOrderAttachmentFile[] | null;
};

type UpdateProductionOrderAttachmentPayload = {
  attachment_type?: string;
  description?: string | null;
  requires_approval?: boolean;
};

type AttachmentApprovalStatus = "approved" | "rejected";

export type {
  AttachmentApprovalStatus,
  ProductionOrderAttachment,
  ProductionOrderAttachmentFile,
  ProductionOrderAttachmentUser,
  UpdateProductionOrderAttachmentPayload,
};
