export type ProductionOrderSectionCompleteness = {
  key: string;
  label: string;
  order: number;
  status: "has_data" | "missing" | "unavailable";
  record_count: number | null;
  rule: string;
};

export type ProductionOrderCompleteness = {
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
