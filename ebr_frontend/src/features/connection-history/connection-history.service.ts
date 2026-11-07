import axiosClient from "@/lib/axios-client";

export const CONNECTION_HISTORY_URL = "/ebr-connection-sessions";
export type ConnectionStatus = "connected" | "reconnecting" | "ended";
export type ConnectionSession = {
  id: number;
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
  meta: { page: number; limit: number; total: number; total_pages: number };
  summary: { connected: number; reconnecting: number; ended: number };
};

export async function fetchConnectionHistory(page: number) {
  const response = await axiosClient.get<ConnectionHistoryResponse>(
    CONNECTION_HISTORY_URL,
    {
      params: {
        page,
        limit: 20,
      },
    },
  );
  return response.data;
}
