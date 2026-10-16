import axiosClient from "@/lib/axios-client";

export type OAuthConnection = {
  id: string;
  resource: string;
  scopes: string[];
  created_at: string;
  client: { id: string; name: string };
};

export const fetchOAuthConnections = async () => {
  const response =
    await axiosClient.get<OAuthConnection[]>("/oauth/connections");
  return response.data;
};

export const revokeOAuthConnection = async (id: string) => {
  await axiosClient.delete(`/oauth/connections/${encodeURIComponent(id)}`);
};
