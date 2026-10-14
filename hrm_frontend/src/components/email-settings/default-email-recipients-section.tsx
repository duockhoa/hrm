"use client";

import { useState } from "react";
import { Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import emailSettingsService, {
  type EmailRecipientConfiguration,
} from "@/services/email-settings.service";
import { emailSettingsError } from "./email-settings-utils";

type Props = {
  emailTypeId: number;
  emails: string[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onChange: (configuration: EmailRecipientConfiguration) => Promise<void>;
};

export default function DefaultEmailRecipientsSection({
  emailTypeId,
  emails,
  busy,
  onBusyChange,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const persist = async (
    operation: () => Promise<EmailRecipientConfiguration>,
    message: string,
  ) => {
    if (busy) return;
    onBusyChange(true);
    try {
      const result = await operation();
      await onChange(result);
      setOpen(false);
      setDeleteTarget(null);
      toast.success(message);
    } catch (error) {
      toast.error(emailSettingsError(error));
    } finally {
      onBusyChange(false);
    }
  };

  const edit = (email: string | null) => {
    setOriginalEmail(email);
    setDraft(email ?? "");
    setOpen(true);
  };

  return (
    <section
      aria-label="Người nhận email mặc định"
      className="mt-6 overflow-hidden rounded-md border border-gray-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Mail className="size-4 text-gray-500" />
            Người nhận email mặc định
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {emails.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Thêm, sửa hoặc xóa từng địa chỉ email.
          </p>
        </div>
        <Button size="sm" disabled={busy} onClick={() => edit(null)}>
          <Plus className="size-4" /> Thêm email
        </Button>
      </div>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12 pl-4">STT</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-24 pr-4 text-right sm:w-44">
              Thao tác
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.length ? (
            emails.map((email, index) => (
              <TableRow key={email.toLowerCase()}>
                <TableCell className="pl-4 text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell className="whitespace-normal break-all">
                  {email}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Sửa ${email}`}
                      title={`Sửa ${email}`}
                      onClick={() => edit(email)}
                    >
                      <Pencil className="size-4" />
                      <span className="hidden sm:inline">Sửa</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={busy}
                      aria-label={`Xóa ${email}`}
                      title={`Xóa ${email}`}
                      onClick={() => setDeleteTarget(email)}
                    >
                      <Trash2 className="size-4" />
                      <span className="hidden sm:inline">Xóa</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="px-4 py-8 text-center whitespace-normal text-gray-500"
              >
                Chưa có người nhận mặc định. Nhấn Thêm email để tạo người nhận.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {originalEmail ? "Sửa email người nhận" : "Thêm email người nhận"}
          </DialogTitle>
          <DialogDescription>
            Nhập một địa chỉ email nhận thông báo mặc định.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void persist(
                () =>
                  originalEmail
                    ? emailSettingsService.updateDefaultEmail(
                        emailTypeId,
                        originalEmail,
                        draft.trim(),
                      )
                    : emailSettingsService.addDefaultEmail(
                        emailTypeId,
                        draft.trim(),
                      ),
                originalEmail
                  ? "Đã cập nhật email người nhận."
                  : "Đã thêm email người nhận.",
              );
            }}
          >
            <div>
              <label
                htmlFor="default-recipient-address"
                className="mb-2 block text-sm font-medium"
              >
                Địa chỉ email
              </label>
              <Input
                id="default-recipient-address"
                type="email"
                required
                maxLength={254}
                value={draft}
                disabled={busy}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="qc@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  busy || !draft.trim() || draft.trim() === originalEmail
                }
              >
                {busy ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Xóa email người nhận</DialogTitle>
          <DialogDescription>
            Xóa địa chỉ này khỏi danh sách người nhận mặc định?
          </DialogDescription>
          <p className="break-all rounded bg-gray-50 p-3 text-sm font-medium">
            {deleteTarget}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (deleteTarget)
                  void persist(
                    () =>
                      emailSettingsService.deleteDefaultEmail(
                        emailTypeId,
                        deleteTarget,
                      ),
                    "Đã xóa email người nhận.",
                  );
              }}
            >
              {busy ? "Đang xóa..." : "Xóa email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
