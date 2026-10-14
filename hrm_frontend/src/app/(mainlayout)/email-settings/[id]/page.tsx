"use client";

import useEmailSettings from "@/components/email-settings/use-email-settings";
import DefaultEmailRecipientsSection from "@/components/email-settings/default-email-recipients-section";
import {
  emailSettingsError,
  splitEmails,
} from "@/components/email-settings/email-settings-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import useMobile from "@/hooks/use-mobile";
import emailSettingsService, {
  type EmailTypeWithDefaults,
} from "@/services/email-settings.service";
import { ChevronRight, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import EmailSettingsPage from "../page";

function EmailDetail({ emailType }: { emailType: EmailTypeWithDefaults }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const { updateRecipients } = useEmailSettings();
  const recipients = splitEmails(emailType.defaultRecipients?.email ?? "");
  const save = async (remove = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const result = remove
        ? await emailSettingsService.deleteDefault(emailType.id)
        : await emailSettingsService.saveDefault(emailType.id, email);
      await updateRecipients(result);
      setEditing(false);
      toast.success(
        result.email
          ? "Đã lưu người nhận mặc định."
          : "Đã xóa cấu hình mặc định.",
      );
    } catch (error) {
      toast.error(emailSettingsError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/email-settings">Email mặc định</Link>
          <ChevronRight className="size-4 shrink-0" />
          <span className="truncate">{emailType.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={saving}
            onClick={() => {
              setEmail(recipients.join(" "));
              setEditing(true);
            }}
          >
            <Pencil className="size-4" />
            Chỉnh sửa
          </Button>
          <Button
            variant="destructive"
            disabled={saving || recipients.length === 0}
            onClick={() => void save(true)}
          >
            <Trash2 className="size-4" />
            Xóa mặc định
          </Button>
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
      <Dialog
        open={editing}
        onOpenChange={(next) => {
          if (!saving) setEditing(next);
        }}
      >
        <DialogContent>
          <DialogTitle>Chỉnh sửa người nhận mặc định</DialogTitle>
          <DialogDescription>{emailType.name}</DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div>
              <label
                htmlFor="default-email"
                className="mb-2 block text-sm font-medium"
              >
                Email người nhận
              </label>
              <Textarea
                id="default-email"
                rows={5}
                value={email}
                disabled={saving}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="qc@example.com qa@example.com"
              />
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Ngăn cách các địa chỉ bằng dấu cách. Để trống để xóa cấu hình
                mặc định.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || email === recipients.join(" ")}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
