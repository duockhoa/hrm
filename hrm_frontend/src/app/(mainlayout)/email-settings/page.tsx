"use client";

import EmailListHeader from "@/components/email-settings/header-email-list";
import { splitEmails } from "@/components/email-settings/email-settings-utils";
import useEmailSettings from "@/components/email-settings/use-email-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { getSearchScopePath, matchesSearchKeyword } from "@/lib/search-utils";
import {
  restoreScrollableChainPosition,
  saveScrollableChainPosition,
} from "@/lib/scroll-position";
import useSearchStore from "@/store/search.store";
import { ChevronRight, Mail } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const SCROLL_KEY = "emailSettingsListScroll";

export default function EmailSettingsPage() {
  const { emailTypes, canManage, isLoading, error } = useEmailSettings();
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const activeId = pathname.startsWith("/email-settings/")
    ? pathname.split("/")[2]
    : null;
  const scope = getSearchScopePath(pathname);
  const query = useSearchStore((state) => state.searchByPath[scope] ?? "");
  const filtered = emailTypes.filter((type) =>
    matchesSearchKeyword(
      [type.name, type.code, type.defaultRecipients?.email],
      query,
    ),
  );

  useEffect(() => {
    restoreScrollableChainPosition(SCROLL_KEY, ref.current);
  }, [filtered.length, isLoading]);
  const openDetail = (id: number) => {
    saveScrollableChainPosition(SCROLL_KEY, ref.current);
    router.push(`/email-settings/${id}`, { scroll: false });
  };

  return (
    <div
      ref={ref}
      className="flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-white shadow-md"
    >
      {canManage && (
        <div className="sticky top-0 z-10 bg-white p-2">
          <EmailListHeader />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-2 pt-0">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-gray-200 p-3"
            >
              <Skeleton className="size-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
            </div>
          ))
        ) : error ? (
          <p role="alert" className="p-4 text-sm text-red-600">
            Không thể tải cấu hình email.
          </p>
        ) : !canManage ? (
          <p className="p-4 text-sm text-gray-500">
            Bạn chưa có quyền quản lý email.
          </p>
        ) : filtered.length ? (
          filtered.map((type) => {
            const recipients = splitEmails(type.defaultRecipients?.email ?? "");
            return (
              <button
                key={type.id}
                type="button"
                aria-current={String(type.id) === activeId ? "page" : undefined}
                onClick={() => openDetail(type.id)}
                className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${String(type.id) === activeId ? "border-blue-200 bg-sky-100 text-blue-950 shadow-sm hover:bg-sky-100" : "border-transparent border-b-gray-200 hover:bg-gray-50"}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{type.name}</span>
                  <span className="mt-1 block truncate text-sm text-gray-500">
                    {recipients.length
                      ? recipients.join(" ")
                      : "Chưa có người nhận mặc định"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-gray-400" />
              </button>
            );
          })
        ) : (
          <p className="p-4 text-center text-sm text-gray-500">
            {query.trim()
              ? "Không tìm thấy loại email phù hợp."
              : "Chưa có loại email nào."}
          </p>
        )}
      </div>
    </div>
  );
}
