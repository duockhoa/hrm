"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_ROUTES } from "@/lib/api-routes";
import emailSettingsService, {
  type EmailRecipientConfiguration,
  type EmailTypeWithDefaults,
} from "@/services/email-settings.service";
import usersService from "@/services/users.service";
import { isAxiosError } from "axios";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

function errorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(". ");
  }
  return "Không thể cập nhật người nhận email. Vui lòng thử lại.";
}

function DefaultRecipientsForm({
  emailType,
  canEdit,
  onSaved,
}: {
  emailType: EmailTypeWithDefaults;
  canEdit: boolean;
  onSaved: (configuration: EmailRecipientConfiguration) => Promise<void>;
}) {
  const [editedEmail, setEditedEmail] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savedEmail = emailType.defaultRecipients?.email ?? "";
  const email = editedEmail ?? savedEmail;
  const inputId = `email-default-${emailType.id}`;

  const save = async (remove = false) => {
    if (!canEdit || isSaving) return;
    setIsSaving(true);
    try {
      const result = remove
        ? await emailSettingsService.deleteDefault(emailType.id)
        : await emailSettingsService.saveDefault(emailType.id, email);
      await onSaved(result);
      setEditedEmail(null);
      toast.success(
        result.email
          ? "Đã lưu người nhận mặc định."
          : "Đã xóa cấu hình mặc định.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="font-semibold text-gray-900">
          {emailType.name}
        </label>
        <span
          className={`rounded-full px-3 py-1 text-xs ${savedEmail ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}
        >
          {savedEmail ? "Đã cấu hình mặc định" : "Chưa có mặc định"}
        </span>
      </div>
      <Textarea
        id={inputId}
        value={email}
        onChange={(event) => setEditedEmail(event.target.value)}
        disabled={!canEdit || isSaving}
        placeholder="qc@example.com,qa@example.com"
        rows={3}
        aria-describedby={`${inputId}-hint`}
      />
      <p id={`${inputId}-hint`} className="mt-2 text-sm text-gray-500">
        Nhập các địa chỉ email, ngăn cách bằng dấu phẩy. Để trống để xóa cấu
        hình mặc định.
      </p>
      {canEdit && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving || !savedEmail}
            onClick={() => void save(true)}
          >
            Xóa mặc định
          </Button>
          <Button type="submit" disabled={isSaving || email === savedEmail}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      )}
    </form>
  );
}

export default function EmailSettingsPage() {
  const {
    data: permissions,
    error: permissionsError,
    isLoading: permissionsLoading,
  } = useSWR(
    `${API_ROUTES.users.me}/permissions`,
    usersService.fetcherMyPermissionKeys,
  );
  const canEdit =
    permissions?.permissionKeys.includes("email-settings.update") ?? false;
  const canRead =
    canEdit ||
    (permissions?.permissionKeys.includes("email-settings.read") ?? false);
  const {
    data: emailTypes = [],
    error,
    isLoading,
    mutate,
  } = useSWR<EmailTypeWithDefaults[]>(
    canRead ? API_ROUTES.emailSettings.defaults : null,
    emailSettingsService.fetchDefaults,
  );

  const onSaved = async (configuration: EmailRecipientConfiguration) => {
    await mutate(
      (current) =>
        current?.map((emailType) =>
          emailType.id === configuration.email_type_id
            ? {
                ...emailType,
                defaultRecipients: configuration.email ? configuration : null,
              }
            : emailType,
        ),
      { revalidate: false },
    );
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <Mail className="size-5" />
          Người nhận email mặc định
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Danh sách này áp dụng khi người thao tác chưa có cấu hình cá nhân cho
          loại email đó. Nếu cả hai danh sách đều trống, email được gửi cho
          chính người thao tác.
        </p>
      </div>
      {permissionsLoading || isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-8 text-gray-500">
          <Loader2 className="size-5 animate-spin" /> Đang tải cấu hình...
        </div>
      ) : permissionsError || error ? (
        <div role="alert" className="rounded-lg bg-white p-6 text-red-600">
          Không thể tải cấu hình email. Vui lòng thử lại.
        </div>
      ) : !canRead ? (
        <p className="rounded-lg bg-white p-6 text-gray-600">
          Bạn chưa có quyền xem cấu hình email mặc định.
        </p>
      ) : emailTypes.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-gray-600">
          Chưa có loại email nào.
        </p>
      ) : (
        <>
          {!canEdit && (
            <p className="text-sm text-gray-600">
              Bạn có quyền xem cấu hình. Cần quyền sửa để thay đổi người nhận.
            </p>
          )}
          {emailTypes.map((emailType) => (
            <DefaultRecipientsForm
              key={emailType.id}
              emailType={emailType}
              canEdit={canEdit}
              onSaved={onSaved}
            />
          ))}
        </>
      )}
    </div>
  );
}
