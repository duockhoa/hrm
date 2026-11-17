"use client";

import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useUserStore from "@/store/user.store";
import {
  RECEIPT_SAMPLING_DRAFTS_URL,
  receiptSamplingDraftsService,
  type ReceiptSamplingDraft,
} from "@/services/warehouse-receipt-sampling-drafts.service";
import type { RecordListPage } from "@/hooks/use-infinite-record-list";
import { WAREHOUSE_RECEIPT_ITEMS_URL } from "@/services/warehouse-receipt-items.service";

export default function ReceiptSamplingSendButton({
  disabled,
  onSent,
}: {
  disabled: boolean;
  onSent: () => Promise<unknown>;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [sendState, setSendState] = useState("");
  const pending = useRef(false);
  const requestId = useRef<string | null>(null);
  const { mutate } = useSWRConfig();
  const storageKey = `receiptSamplingSendRequest:${userId}`;
  function clearRequest() {
    requestId.current = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional storage. */
    }
  }
  async function send() {
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError("");
    try {
      if (!requestId.current) {
        try {
          requestId.current = sessionStorage.getItem(storageKey);
        } catch {
          /* Optional storage. */
        }
        requestId.current ||= crypto.randomUUID();
        try {
          sessionStorage.setItem(storageKey, requestId.current);
        } catch {
          /* Optional storage. */
        }
      }
      const result = await receiptSamplingDraftsService.send(requestId.current);
      clearRequest();
      setSendState("");
      await mutate<RecordListPage<ReceiptSamplingDraft>>(
        (key) => Array.isArray(key) && key[0] === RECEIPT_SAMPLING_DRAFTS_URL,
        (page) => (page ? { ...page, data: [], total: 0 } : page),
        { revalidate: false },
      ).catch(() => {});
      await mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith(`${WAREHOUSE_RECEIPT_ITEMS_URL}/`) &&
          key.endsWith("/sampling-request-draft"),
        null,
        { revalidate: false },
      ).catch(() => {});
      toast.success(`Đã gửi email PYCLM cho ${result.sentCount} bản nháp.`);
      // Refresh failures must not turn a successful email into a resend action.
      await onSent().catch(() => {});
    } catch (error) {
      const data = isAxiosError(error) ? error.response?.data : undefined;
      const state = typeof data?.sendState === "string" ? data.sendState : "";
      setSendState(state);
      if (state === "failed") clearRequest();
      setError(
        typeof data?.message === "string"
          ? data.message
          : "Chưa hoàn tất yêu cầu gửi PYCLM. Vui lòng thử lại để kiểm tra kết quả.",
      );
    } finally {
      pending.current = false;
      setSending(false);
    }
  }
  return (
    <div className="flex max-w-xl flex-col items-end gap-2">
      <Button
        size="sm"
        disabled={
          sending ||
          disabled ||
          sendState === "uncertain" ||
          sendState === "sending"
        }
        onClick={() => {
          if (sendState === "confirmed") void send();
          else setConfirmOpen(true);
        }}
      >
        <Send className="size-4" />
        {sending
          ? "Đang gửi..."
          : sendState === "confirmed"
            ? "Hoàn tất lưu PYCLM"
            : "Gửi PYCLM"}
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="md:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Xác nhận gửi PYCLM</DialogTitle>
            <DialogDescription>
              Bạn có muốn gửi email PYCLM cho toàn bộ bản nháp hiện có? Thông
              tin gửi sẽ được lưu và các bản nháp của đợt gửi sẽ được xóa khi
              gửi thành công.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={sending || disabled}
              onClick={() => {
                setConfirmOpen(false);
                void send();
              }}
            >
              Xác nhận gửi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {error && (
        <p role="alert" className="text-right text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
