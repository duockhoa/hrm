"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  networkPoliciesService,
  NetworkPolicy,
} from "@/services/network-policies.service";
import { usersService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";

export default function UserNetworkPolicy({
  user,
}: {
  user: { id: number; network_policy_code?: string };
}) {
  const [saving, setSaving] = useState(false);
  const { data: permissions } = useSWR(
    `${API_ROUTES.users.me}/permissions`,
    usersService.fetcherMyPermissionKeys,
  );
  const canEdit = permissions?.permissionKeys.includes("users.update");
  const { data: policies, error } = useSWR(
    canEdit ? "/network-policies" : null,
    networkPoliciesService.list,
  );

  async function assign(code: NetworkPolicy["code"]) {
    setSaving(true);
    try {
      await networkPoliciesService.assign(user.id, code);
      await Promise.all([
        mutate(`${API_ROUTES.users.base}/${user.id}`),
        mutate(API_ROUTES.users.base),
      ]);
      toast.success("Đã lưu chính sách mạng.");
    } catch {
      toast.error("Không thể lưu chính sách mạng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full max-w-4xl rounded-md border bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Chính sách truy cập mạng</h2>
      <p className="my-2 text-sm text-slate-500">
        Hiện chỉ lưu cấu hình, chưa giới hạn truy cập các module.
      </p>
      <label className="flex flex-wrap items-center gap-3">
        <span>Chính sách</span>
        <select
          aria-label="Chính sách truy cập mạng"
          className="rounded border p-2"
          value={user.network_policy_code ?? "OPEN"}
          disabled={!canEdit || !policies || saving}
          onChange={(e) => assign(e.target.value as NetworkPolicy["code"])}
        >
          {(
            policies ?? [
              { id: 1, code: "OPEN", name: "Mở" },
              { id: 2, code: "IP_ALLOWLIST", name: "Theo IP" },
            ]
          ).map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        {saving && <span role="status">Đang lưu...</span>}
      </label>
      {error && (
        <p role="alert" className="mt-2 text-red-600">
          Không tải được chính sách mạng.
        </p>
      )}
      {canEdit && user.network_policy_code === "IP_ALLOWLIST" && (
        <Link
          className="mt-3 block text-sm text-blue-600 underline"
          href="/network-access"
        >
          Quản lý danh sách IP được phép dùng chung
        </Link>
      )}
    </section>
  );
}
