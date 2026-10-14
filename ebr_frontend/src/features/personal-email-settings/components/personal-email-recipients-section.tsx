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
import { isAxiosError } from "axios";

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(". ");
  }
  return "Không thể cập nhật người nhận email. Vui lòng thử lại.";
}

type Props = {
  emails: string[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onChange: (emails: string[]) => Promise<void>;
};

export default function PersonalEmailRecipientsSection({
  emails,
  busy,
  onBusyChange,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const persist = async (nextEmails: string[], message: string) => {
    if (busy) return;
    onBusyChange(true);
    try {
      await onChange(nextEmails);
      setOpen(false);
      setDeleteTarget(null);
      toast.success(message);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
      aria-label="Người nhận email của tôi"
      className="overflow-hidden rounded-md border border-gray-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Mail className="size-4 text-gray-500" />
            Người nhận email của tôi
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {emails.length}
            </span>
          </h2>
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
                Chưa thiết lập người nhận riêng, đang dùng cấu hình chung. Nhấn
                Thêm email để cá nhân hoá.
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
            Nhập một địa chỉ email nhận thông báo riêng cho loại email này.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const email = draft.trim();
              if (
                emails.some(
                  (existing) =>
                    existing !== originalEmail &&
                    existing.toLowerCase() === email.toLowerCase(),
                )
              ) {
                toast.error("Địa chỉ email này đã có trong danh sách.");
                return;
              }
              void persist(
                originalEmail
                  ? emails.map((existing) =>
                      existing === originalEmail ? email : existing,
                    )
                  : [...emails, email],
                originalEmail
                  ? "Đã cập nhật email người nhận."
                  : "Đã thêm email người nhận.",
              );
            }}
          >
            <div>
              <label
                htmlFor="personal-recipient-address"
                className="mb-2 block text-sm font-medium"
              >
                Địa chỉ email
              </label>
              <Input
                id="personal-recipient-address"
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
            Xóa địa chỉ này khỏi danh sách người nhận riêng? Nếu xóa email cuối
            cùng, hệ thống sẽ dùng cấu hình chung.
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
                    emails.filter((email) => email !== deleteTarget),
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
