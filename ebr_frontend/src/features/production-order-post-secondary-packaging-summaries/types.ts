type SummaryUser = {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type SummaryProductionOrder = {
  id?: string | number;
  production_order_code?: string | null;
  lot_no?: string | number | null;
  item_code?: string | null;
  description?: string | null;
  item?: {
    item_code?: string | null;
    item_name?: string | null;
  } | null;
};

type PendingProcessItem = {
  id?: string | number;
  summary_id?: string | number | null;
  pending_quantity?: string | number | null;
  pending_reason?: string | null;
  processing_plan?: string | null;
  created_at?: string | null;
};

type PendingCancellationItem = {
  id?: string | number;
  summary_id?: string | number | null;
  cancellation_quantity?: string | number | null;
  cancellation_reason?: string | null;
  cancellation_plan?: string | null;
  created_at?: string | null;
};

type PostSecondaryPackagingSummary = {
  id?: string | number;
  production_order_id?: string | number | null;
  semi_finished_product_order_id?: string | number | null;
  received_bag_count?: string | number | null;
  remaining_quantity?: string | number | null;
  unit?: string | null;
  remaining_reason?: string | null;
  created_by_id?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  createdBy?: SummaryUser | null;
  created_by?: SummaryUser | null;
  semiFinishedProductOrder?: SummaryProductionOrder | null;
  semi_finished_product_order?: SummaryProductionOrder | null;
  pendingProcessItems?: PendingProcessItem[] | null;
  pending_process_items?: PendingProcessItem[] | null;
  pendingCancellationItems?: PendingCancellationItem[] | null;
  pending_cancellation_items?: PendingCancellationItem[] | null;
};

type PostSecondaryPackagingSummaryPayload = {
  semi_finished_product_order_id: string | number;
  received_bag_count: string | number;
  remaining_quantity: string | number;
  unit?: string | null;
  remaining_reason?: string | null;
};

type PendingProcessItemPayload = {
  pending_quantity: string | number;
  pending_reason: string;
  processing_plan?: string | null;
};

type PendingCancellationItemPayload = {
  cancellation_quantity: string | number;
  cancellation_reason: string;
  cancellation_plan?: string | null;
};

export type {
  PendingCancellationItem,
  PendingCancellationItemPayload,
  PendingProcessItem,
  PendingProcessItemPayload,
  PostSecondaryPackagingSummary,
  PostSecondaryPackagingSummaryPayload,
  SummaryProductionOrder,
  SummaryUser,
};
