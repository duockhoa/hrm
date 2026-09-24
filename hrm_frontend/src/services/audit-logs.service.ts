import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name: string | null;
  reason: string | null;
  request_id: string | null;
  created_at: string;
};

export type AuditLogsResponse = {
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type AuditLogFilters = {
  page: number;
  limit?: number;
  keyword?: string;
  entityType?: string;
  action?: AuditLog["action"];
};

const getAuditLogs = async ({
  page,
  limit = 20,
  keyword,
  entityType,
  action,
}: AuditLogFilters): Promise<AuditLogsResponse> => {
  const response = await axiosClient.get<AuditLogsResponse>(
    API_ROUTES.auditLogs.base,
    {
      params: {
        page,
        limit,
        keyword: keyword?.trim() || undefined,
        entity_type: entityType?.trim() || undefined,
        action,
      },
    },
  );
  return response.data;
};

const auditLogsService = { getAuditLogs };

export default auditLogsService;
