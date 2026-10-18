"use client";

import { useState } from "react";
import { AppWindow, Loader2, X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft } from "react-icons/fa6";
import { RiOpenaiFill } from "react-icons/ri";
import { SiClaude, SiGithub, SiGooglegemini } from "react-icons/si";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import useUserStore from "@/store/user.store";
import {
  fetchOAuthConnections,
  revokeOAuthConnection,
} from "@/services/oauth-connections.service";

function ApplicationIcon({ name }: { name: string }) {
  const normalizedName = name.toLowerCase();
  const className = "size-9";

  if (normalizedName.includes("gemini")) {
    return <SiGooglegemini className={`${className} text-blue-500`} />;
  }
  if (normalizedName.includes("google")) {
    return <FcGoogle className={className} />;
  }
  if (normalizedName.includes("chatgpt") || normalizedName.includes("openai")) {
    return <RiOpenaiFill className={className} />;
  }
  if (normalizedName.includes("claude") || normalizedName.includes("anthropic")) {
    return <SiClaude className={`${className} text-[#D97757]`} />;
  }
  if (normalizedName.includes("github")) {
    return <SiGithub className={className} />;
  }
  if (normalizedName.includes("microsoft")) {
    return <FaMicrosoft className={`${className} text-[#00A4EF]`} />;
  }

  return <AppWindow className={`${className} text-gray-500`} />;
}

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
    <section className="min-w-0 shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <h2 className="mb-4 text-lg font-semibold">Ứng dụng đã kết nối</h2>
      {isLoading && (
        <p className="text-sm text-gray-500" aria-live="polite">
          Đang tải kết nối…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-red-600"
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
      <ul className="flex flex-wrap gap-x-4 gap-y-6 pt-2 sm:gap-x-6">
        {data?.map((connection) => (
          <li
            key={connection.id}
            className="relative flex w-24 min-w-0 max-w-full flex-col items-center gap-2"
            title={`Đọc dữ liệu MCP · Đã cấp quyền ${new Date(connection.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`}
          >
            <div className="relative flex size-16 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-sm">
              <span aria-hidden="true">
                <ApplicationIcon name={connection.client.name} />
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="absolute -right-2 -top-2 size-6 rounded-full border-gray-200 bg-white text-gray-500 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                disabled={revoking !== null}
                onClick={() => void revoke(connection.id)}
                aria-label={`Thu hồi kết nối ${connection.client.name}`}
                aria-busy={revoking === connection.id}
                title={`Thu hồi kết nối ${connection.client.name}`}
              >
                {revoking === connection.id ? (
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <X aria-hidden="true" className="size-3.5" />
                )}
              </Button>
            </div>
            <p className="w-full wrap-anywhere text-center text-sm font-medium text-gray-800">
              {connection.client.name}
            </p>
            <p className="sr-only">
              Đọc dữ liệu MCP · Đã cấp quyền{" "}
              <time dateTime={connection.created_at}>
                {new Date(connection.created_at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </time>
              {revoking === connection.id && " · Đang thu hồi…"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
