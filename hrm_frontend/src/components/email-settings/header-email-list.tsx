"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import emailSettingsService from "@/services/email-settings.service";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiOutlineRight } from "react-icons/ai";
import { toast } from "sonner";
import { emailSettingsError } from "./email-settings-utils";
import useEmailSettings from "./use-email-settings";

export default function EmailListHeader() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const { addType } = useEmailSettings();
  const router = useRouter();

  const create = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const emailType = await emailSettingsService.createType({
        name: name.trim(),
        code: code.trim(),
      });
      await addType(emailType);
      setOpen(false);
      setName("");
      setCode("");
      toast.success("Đã thêm loại email.");
      router.push(`/email-settings/${emailType.id}`, { scroll: false });
    } catch (error) {
      toast.error(emailSettingsError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 bg-white pb-2">
      <div className="flex items-center gap-2">
        <AiOutlineRight />
        <Link href="/email-settings">Email mặc định</Link>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next);
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Thêm loại email</DialogTitle>
          <DialogDescription>
            Thông tin loại email cần cấu hình người nhận mặc định.
          </DialogDescription>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div>
              <label
                htmlFor="email-type-name"
                className="mb-2 block text-sm font-medium"
              >
                Tên loại email
              </label>
              <Input
                id="email-type-name"
                required
                maxLength={255}
                disabled={saving}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Phiếu yêu cầu lấy mẫu"
              />
            </div>
            <div>
              <label
                htmlFor="email-type-code"
                className="mb-2 block text-sm font-medium"
              >
                Mã loại email
              </label>
              <Input
                id="email-type-code"
                required
                pattern="[a-z][a-z0-9_]*"
                maxLength={100}
                disabled={saving}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="sampling_request"
              />
              <p className="mt-2 text-xs text-gray-500">
                Mã cố định để liên kết với chức năng gửi email tương ứng.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim() || !code.trim()}
              >
                {saving ? "Đang lưu..." : "Thêm mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
