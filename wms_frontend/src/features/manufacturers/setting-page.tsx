"use client";

import { cn } from "@/lib/utils";
import { Factory, Truck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SuppliersPage from "@/features/suppliers/suppliers-page";
import ManufacturersPage from "./manufacturers-page";

const sections = [
  {
    id: "manufacturers",
    label: "Nhà sản xuất",
    description: "Quản lý danh sách nhà sản xuất dùng trong hệ thống.",
    Icon: Factory,
  },
  {
    id: "suppliers",
    label: "Nhà cung cấp",
    description: "Tra cứu nhà cung cấp được đồng bộ từ SAP.",
    Icon: Truck,
  },
] as const;

export default function SettingPage() {
  const searchParams = useSearchParams();
  const activeSection =
    searchParams.get("section") === "suppliers" ? "suppliers" : "manufacturers";

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
          <nav aria-label="Danh mục cài đặt" className="space-y-1">
            {sections.map(({ id, label, description, Icon }) => {
              const isActive = activeSection === id;
              return (
                <Link
                  key={id}
                  href={`/setting?section=${id}`}
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md p-3 text-left transition",
                    isActive
                      ? "bg-white shadow-sm ring-1 ring-blue-100"
                      : "hover:bg-white",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      isActive ? "text-blue-600" : "text-gray-500",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                      {description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-h-0 min-w-0 overflow-hidden">
          {activeSection === "suppliers" ? (
            <SuppliersPage />
          ) : (
            <ManufacturersPage />
          )}
        </main>
      </div>
    </div>
  );
}
