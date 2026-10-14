"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_ROUTES } from "@/lib/api-routes";
import { matchesSearchKeyword } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import personalEmailSettingsService from "@/services/personal-email-settings.service";
import userService from "@/services/user.service";
import { Loader2, Mail, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { EmailType, PersonalEmailRecipients } from "../types";
import PersonalEmailRecipientsSection from "./personal-email-recipients-section";


function PersonalEmailWorkspace({ userId }: { userId: number }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    data: types = [],
    error: typesError,
    isLoading: typesLoading,
    isValidating: typesValidating,
    mutate: reloadTypes,
  } = useSWR<EmailType[]>(
    API_ROUTES.emailSettings.types,
    personalEmailSettingsService.fetchTypes,
  );
  const {
    data: configurations = [],
    error: personalError,
    isLoading: personalLoading,
    isValidating: personalValidating,
    mutate: reloadPersonal,
  } = useSWR<PersonalEmailRecipients[]>(
    [API_ROUTES.emailSettings.me, userId],
    personalEmailSettingsService.fetchPersonal,
  );
  const filtered = types.filter((type) =>
    matchesSearchKeyword(
      [
        type.name,
        type.code,
        configurations.find(
          (configuration) => configuration.email_type_id === type.id,
        )?.email,
      ],
      query,
    ),
  );
  const selected =
    filtered.find((type) => type.id === selectedId) ?? filtered[0];
  const savedEmail =
    configurations.find(
      (configuration) => configuration.email_type_id === selected?.id,
    )?.email ?? "";
  const loading = typesLoading || personalLoading;
  const error = typesError || personalError;

  const reload = async () => {
    try {
      await Promise.all([reloadTypes(), reloadPersonal()]);
    } catch {
      toast.error("Không thể tải lại cấu hình email.");
    }
  };

  const updateRecipients = async (emails: string[]) => {
    if (!selected) return;
    const result = emails.length
      ? await personalEmailSettingsService.savePersonal(
          selected.id,
          emails.join(","),
        )
      : await personalEmailSettingsService.deletePersonal(selected.id);
    await reloadPersonal(
      (current) => {
        const remaining = (current ?? []).filter(
          (configuration) => configuration.email_type_id !== result.email_type_id,
        );
        return result.email ? [...remaining, result] : remaining;
      },
      { revalidate: false },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto rounded-lg bg-white p-3 shadow-md lg:overflow-hidden">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">Cá nhân hoá email</h1>
          <p className="mt-1 text-sm text-gray-500">
            Thiết lập người nhận email riêng cho từng loại email.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Tải lại cấu hình email"
          disabled={saving || typesValidating || personalValidating}
          onClick={() => void reload()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Đang tải cấu hình email...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Không thể tải cấu hình email. Vui lòng thử lại.
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            aria-label="Danh sách loại email"
            className="flex min-h-0 flex-col rounded-md border bg-gray-50 p-2"
          >
            <div className="relative mb-2 shrink-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                aria-label="Tìm loại email"
                placeholder="Tìm loại email..."
                value={query}
                disabled={saving}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-white pl-9"
              />
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto lg:max-h-none lg:flex-1">
              {filtered.map((type) => {
                const configured = Boolean(
                  configurations.find(
                    (configuration) => configuration.email_type_id === type.id,
                  )?.email,
                );
                const active = type.id === selected?.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={active}
                    disabled={saving}
                    onClick={() => setSelectedId(type.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md p-3 text-left transition disabled:opacity-60",
                      active
                        ? "bg-white shadow-sm ring-1 ring-blue-100"
                        : "hover:bg-white",
                    )}
                  >
                    <Mail
                      className={cn(
                        "mt-0.5 size-5 shrink-0",
                        active ? "text-blue-600" : "text-gray-500",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {type.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                        {configured ? "Đã cá nhân hoá" : "Chưa thiết lập riêng"}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="p-3 text-sm text-gray-500">
                  {types.length
                    ? "Không tìm thấy loại email phù hợp."
                    : "Chưa có loại email nào."}
                </p>
              )}
            </div>
          </aside>
          <main className="min-h-0 overflow-auto">
            {selected ? (
              <section className="rounded-md border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <h2 className="font-semibold">{selected.name}</h2>
                  <Badge variant={savedEmail ? "secondary" : "outline"}>
                    {savedEmail ? "Đã cá nhân hoá" : "Chưa thiết lập riêng"}
                  </Badge>
                </div>
                <div className="p-4">
                  <PersonalEmailRecipientsSection
                    key={selected.id}
                    emails={savedEmail.split(/[,\s]+/).filter(Boolean)}
                    busy={saving}
                    onBusyChange={setSaving}
                    onChange={updateRecipients}
                  />
                </div>
              </section>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed bg-white p-8 text-center">
                <Mail className="mb-3 size-8 text-gray-400" />
                <h2 className="text-lg font-semibold">Chọn một loại email</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Người nhận riêng của từng loại email được thiết lập tại đây.
                </p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function PersonalEmailSettingsPage() {
  const {
    data: user,
    error,
    isLoading,
  } = useSWR<{ id: number }>(API_ROUTES.users.me, userService.fetcherMe);
  if (isLoading)
    return <p className="p-4 text-sm text-gray-500">Đang tải tài khoản...</p>;
  if (error || !user?.id)
    return (
      <p role="alert" className="p-4 text-sm text-red-600">
        Không thể tải tài khoản đang đăng nhập.
      </p>
    );
  return <PersonalEmailWorkspace key={user.id} userId={user.id} />;
}
