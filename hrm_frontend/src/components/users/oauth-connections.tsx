"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useUserStore from "@/store/user.store";
import {
  fetchOAuthConnections,
  revokeOAuthConnection,
} from "@/services/oauth-connections.service";

export default function OAuthConnections() {
  const user = useUserStore((state) => state.user);
  const { data, error, isLoading, mutate } = useSWR(
    user ? ["oauth-connections", user.id] : null,
    fetchOAuthConnections,
  );
  const [revoking, setRevoking] = useState<string | null>(null);

  async function revoke(id: string) {
    setRevoking(id);
    try {
      await revokeOAuthConnection(id);
      await mutate();
      toast.success("Đã thu hồi kết nối ứng dụng.");
    } catch {
      toast.error("Không thể thu hồi kết nối. Vui lòng thử lại.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 p-4 shadow-md">
      <h2 className="mb-2 text-lg font-semibold">Ứng dụng đã kết nối</h2>
      <p className="mb-4 text-sm text-gray-500">
        Các ứng dụng đang được bạn cấp quyền sử dụng DKPHARMA APP. Thu hồi sẽ
        ngừng quyền truy cập của kết nối đó ngay lập tức.
      </p>
      {isLoading && (
        <p className="text-sm text-gray-500" aria-live="polite">
          Đang tải kết nối…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 text-sm text-red-600"
        >
          <span>Không tải được danh sách kết nối.</span>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            Thử lại
          </Button>
        </div>
      )}
      {!isLoading && !error && data?.length === 0 && (
        <p className="text-sm text-gray-500">
          Bạn chưa cấp quyền cho ứng dụng nào.
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {data?.map((connection) => (
          <li
            key={connection.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium text-gray-800">
                {connection.client.name}
              </p>
              <p className="text-sm text-gray-500">
                Đọc dữ liệu MCP · Đã cấp quyền{" "}
                {new Date(connection.created_at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={revoking !== null}
              onClick={() => void revoke(connection.id)}
              aria-label={`Thu hồi kết nối ${connection.client.name}`}
            >
              {revoking === connection.id ? "Đang thu hồi…" : "Thu hồi"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
