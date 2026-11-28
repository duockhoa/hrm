"use client";

import { type FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CONNECTION_HISTORY_PDF_FILENAME,
  fetchConnectionHistoryPdf,
} from "./connection-history.service";

export default function ConnectionHistoryExportDialog({
  connectedFrom,
  connectedTo,
  keyword,
  disabled,
}: {
  connectedFrom: string;
  connectedTo: string;
  keyword: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [user, setUser] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const invalidRange = Boolean(from && to && from > to);

  function changeOpen(nextOpen: boolean) {
    if (exporting) return;
    if (nextOpen) {
      setFrom(connectedFrom);
      setTo(connectedTo);
      setUser(keyword);
      setError("");
    }
    setOpen(nextOpen);
  }

  async function exportPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || invalidRange || exporting) return;
    setExporting(true);
    setError("");
    try {
      const blob = await fetchConnectionHistoryPdf(from, to, user);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = CONNECTION_HISTORY_PDF_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) {
        setError("Bạn chưa có quyền xuất lịch sử kết nối.");
      } else if (status === 400) {
        setError("Bộ lọc không hợp lệ. Vui lòng kiểm tra ngày và người dùng.");
      } else {
        setError("Không thể xuất lịch sử kết nối. Vui lòng thử lại sau.");
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label="Tải xuống"
          title="Tải xuống"
        >
          <Download aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!exporting}>
        <DialogHeader>
          <DialogTitle>Xuất lịch sử kết nối</DialogTitle>
          <DialogDescription>
            Lọc theo ngày mở phiên và người dùng. Có thể để trống bộ lọc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={exportPdf} className="space-y-4">
          <fieldset disabled={exporting} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Từ ngày
                <Input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                Đến ngày
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              Người dùng
              <Input
                value={user}
                maxLength={100}
                placeholder="Tên, tài khoản hoặc email"
                onChange={(event) => setUser(event.target.value)}
              />
            </label>
          </fieldset>
          {(invalidRange || error) && (
            <p role="alert" className="text-sm text-red-600">
              {invalidRange ? "Từ ngày phải trước hoặc bằng đến ngày." : error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={exporting}
              onClick={() => changeOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={disabled || invalidRange || exporting}>
              {exporting ? (
                <><Loader2 className="animate-spin" /> Đang xuất PDF...</>
              ) : (
                <><Download /> Xuất PDF</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
