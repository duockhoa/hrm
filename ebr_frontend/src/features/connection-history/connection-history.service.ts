import axiosClient from "@/lib/axios-client";

export const CONNECTION_HISTORY_URL = "/app-connection-sessions/hsl";
export const CONNECTION_HISTORY_PDF_FILENAME = "lich-su-ket-noi-ebr.pdf";
export type ConnectionStatus = "connected" | "reconnecting" | "ended";
export type ConnectionSession = {
  id: number;
  application_key: "hsl";
  connected_at: string;
  last_seen_at: string;
  disconnected_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  disconnect_reason: string | null;
  connection_count: number;
  ip_address: string | null;
  user_agent: string | null;
  status: ConnectionStatus;
  user: {
    id: number;
    username: string;
    name: string | null;
    email: string | null;
  };
};
export type ConnectionHistoryResponse = {
  data: ConnectionSession[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more?: boolean;
    next_cursor?: string | null;
  };
  summary: { connected: number; reconnecting: number; ended: number };
};

export async function fetchConnectionHistory(
  page: number,
  status?: ConnectionStatus,
  limit = 20,
  keyword = "",
) {
  const response = await axiosClient.get<ConnectionHistoryResponse>(
    CONNECTION_HISTORY_URL,
    {
      params: {
        page,
        limit,
        status,
        keyword: keyword.trim() || undefined,
      },
    },
  );
  return response.data;
}

export async function fetchConnectionHistoryCursor(
  cursor: string | null,
  status?: ConnectionStatus,
  keyword = "",
  connectedFrom = "",
  connectedTo = "",
) {
  const response = await axiosClient.get<ConnectionHistoryResponse>(
    CONNECTION_HISTORY_URL,
    {
      params: {
        pagination: "cursor",
        limit: 300,
        cursor: cursor || undefined,
        status,
        keyword: keyword.trim() || undefined,
        connected_from: connectedFrom || undefined,
        connected_to: connectedTo || undefined,
      },
    },
  );
  return response.data;
}

export async function fetchConnectionHistoryPdf(
  connectedFrom: string,
  connectedTo: string,
  keyword: string,
) {
  const response = await axiosClient.get<Blob>(
    `${CONNECTION_HISTORY_URL}/export-pdf`,
    {
      responseType: "blob",
      params: {
        connected_from: connectedFrom || undefined,
        connected_to: connectedTo || undefined,
        keyword: keyword.trim() || undefined,
      },
    },
  );
  return response.data;
}
