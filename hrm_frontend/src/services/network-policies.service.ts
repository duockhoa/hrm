import axiosClient from "@/lib/axios-client";

export type NetworkPolicy = {
  id: number;
  code: "OPEN" | "IP_ALLOWLIST";
  name: string;
};
export type NetworkRange = { id: number; name: string; cidr: string };
export const networkPoliciesService = {
  list: () =>
    axiosClient.get<NetworkPolicy[]>("/network-policies").then((r) => r.data),
  ranges: () =>
    axiosClient
      .get<NetworkRange[]>("/network-policies/ranges")
      .then((r) => r.data),
  saveRange: (data: Pick<NetworkRange, "name" | "cidr">, id?: number) =>
    id === undefined
      ? axiosClient.post("/network-policies/ranges", data)
      : axiosClient.put(`/network-policies/ranges/${id}`, data),
  deleteRange: (id: number) =>
    axiosClient.delete(`/network-policies/ranges/${id}`),
  assign: (userId: number, code: NetworkPolicy["code"]) =>
    axiosClient.put(`/users/${userId}/network-policy`, { code }),
};
