export type EditHistoryEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_key?: string | null;
  entity_name?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name: string | null;
  reason: string | null;
  created_at: string;
};

export type EditHistoryPage = {
  data: EditHistoryEntry[];
  meta: { page: number; limit: number; total: number; total_pages: number };
};

export type EditHistoryField = {
  label: string;
  values?: Record<string, string>;
  type?: "number" | "text" | "date" | "boolean" | "json" | "feature-list";
};

export type EditHistoryFields = Record<string, EditHistoryField>;
