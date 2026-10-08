"use client";

import { cn } from "@/lib/utils";
import { Factory, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ManufacturersPage from "./manufacturers-page";

export default function SettingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive =
    (searchParams.get("section") ?? "manufacturers") === "manufacturers";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg bg-white p-3 shadow-md">
      <div className="border-b pb-3">
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các cấu hình vận hành của hệ thống.
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 rounded-md border bg-gray-50 p-2">
          <div className="space-y-1">
            <button
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => router.push("/setting?section=manufacturers")}
              className={cn(
                "flex w-full items-start gap-3 rounded-md p-3 text-left transition",
                isActive
                  ? "bg-white shadow-sm ring-1 ring-blue-100"
                  : "hover:bg-white",
              )}
            >
              <Factory
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  isActive ? "text-blue-600" : "text-gray-500",
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  Nhà sản xuất
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                  Quản lý danh sách nhà sản xuất dùng trong hệ thống.
                </span>
              </span>
            </button>
          </div>
        </aside>
        <main className="min-h-0 min-w-0 overflow-hidden">
          {isActive ? (
            <ManufacturersPage />
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
              <Settings className="mb-3 size-8 text-gray-400" />
              <h2 className="text-lg font-semibold">Chọn một mục cài đặt</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                Các nhóm cài đặt hệ thống sẽ được quản lý trong khu vực này.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
