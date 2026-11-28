export type PendingIpcRecord = {
  id: number;
  description: string | null;
  created_at: string;
  qa_staff_approved_at: string | null;
  productionOrder: {
    id: number;
    production_order_code: string | null;
    item_code: string;
    lot_no: string;
    planned_quatity: number;
    unit: string;
    item: { item_name: string };
    samplingRequests: { sent_at: string }[];
  };
};
