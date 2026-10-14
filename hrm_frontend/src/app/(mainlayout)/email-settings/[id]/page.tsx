"use client";

import useEmailSettings from "@/components/email-settings/use-email-settings";
import DefaultEmailRecipientsSection from "@/components/email-settings/default-email-recipients-section";
import { splitEmails } from "@/components/email-settings/email-settings-utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import useMobile from "@/hooks/use-mobile";
import { type EmailTypeWithDefaults } from "@/services/email-settings.service";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import EmailSettingsPage from "../page";

function EmailDetail({ emailType }: { emailType: EmailTypeWithDefaults }) {
  const [saving, setSaving] = useState(false);
  const { updateRecipients } = useEmailSettings();
  const recipients = splitEmails(emailType.defaultRecipients?.email ?? "");

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/email-settings">Email mặc định</Link>
          <ChevronRight className="size-4 shrink-0" />
          <span className="truncate">{emailType.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/email-settings"
            aria-label="Đóng chi tiết"
            className="rounded p-2 hover:bg-gray-100"
          >
            <X className="size-4" />
          </Link>
        </div>
      </header>
      <div className="mx-auto mt-6 w-full max-w-3xl">
        <h1 className="mb-5 text-xl font-semibold">{emailType.name}</h1>
        <dl className="overflow-hidden rounded-md border border-gray-200 text-sm">
          <div className="grid gap-2 border-b border-gray-200 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <dt className="text-gray-500">Mã loại email</dt>
            <dd className="break-all">{emailType.code}</dd>
          </div>
          <div className="grid gap-2 border-b border-gray-200 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <dt className="text-gray-500">Trạng thái</dt>
            <dd>{recipients.length ? "Đã cấu hình" : "Chưa cấu hình"}</dd>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <dt className="text-gray-500">Số người nhận</dt>
            <dd>{recipients.length} email</dd>
          </div>
        </dl>
        <DefaultEmailRecipientsSection
          emailTypeId={emailType.id}
          emails={recipients}
          busy={saving}
          onBusyChange={setSaving}
          onChange={updateRecipients}
        />
      </div>
    </>
  );
}

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useMobile();
  const { emailTypes, canManage, isLoading, error } = useEmailSettings();
  if (isLoading)
    return (
      <p className="p-4 text-sm text-gray-500">Đang tải cấu hình email...</p>
    );
  if (error)
    return (
      <p role="alert" className="p-4 text-sm text-red-600">
        Không thể tải cấu hình email.
      </p>
    );
  if (!canManage)
    return (
      <p className="p-4 text-sm text-gray-500">
        Bạn chưa có quyền quản lý email.
      </p>
    );
  const emailType = emailTypes.find((type) => String(type.id) === id);
  if (!emailType)
    return (
      <div className="p-4">
        <p className="mb-3 text-sm text-gray-500">Không tìm thấy loại email.</p>
        <Link href="/email-settings" className="text-sm text-blue-600">
          Trở lại danh sách
        </Link>
      </div>
    );
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize="35%"
            minSize="280px"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <EmailSettingsPage />
          </ResizablePanel>
        )}
        {!isMobile && <ResizableHandle />}
        <ResizablePanel
          defaultSize={isMobile ? "100%" : "65%"}
          className="min-w-0 overflow-auto p-4"
        >
          <EmailDetail key={emailType.id} emailType={emailType} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
