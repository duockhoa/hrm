/** Lightweight response from the finished/semi-finished lot list endpoints. */
export type ProductionOrderListItem = {
  id: number;
  item_code: string;
  description: string;
  production_order_code: string | null;
  lot_no: string;
  status: string;
  planned_quatity: number;
  unit: string;
  creation_date: string;
  start_date: string;
  date_manufacture: string | null;
  expire_date: string | null;
  item: { item_code: string; item_name: string; unit: string | null };
  documentControl: {
    batch_record_issued_at: string | null;
    batch_record_received_at: string | null;
    warehouse_release_received_at: string | null;
    test_certificate_received_at: string | null;
  } | null;
  pyclm: { isSent: boolean };
};

export type ProductionOrderSectionCompleteness = {
  key: string;
  label: string;
  order: number;
  status: "has_data" | "missing" | "unavailable";
  record_count: number | null;
  rule: string;
};

export type ProductionOrderCompleteness = {
  action_sections?: (ProductionOrderSectionCompleteness & {
    action_keys: string[];
  })[];
  production_order_id: number;
  configuration_source: "item" | "snapshot";
  rule_version: number;
  required_count: number;
  completed_count: number;
  is_complete: boolean;
  required_sections: ProductionOrderSectionCompleteness[];
  missing_sections: ProductionOrderSectionCompleteness[];
  unavailable_sections: ProductionOrderSectionCompleteness[];
};
