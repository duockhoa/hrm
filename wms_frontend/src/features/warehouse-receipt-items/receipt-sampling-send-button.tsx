"use client";

import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize as serializeInfiniteKey } from "swr/infinite";
import { API_ROUTES } from "@/lib/api-routes";
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
  samplingDraftListUrl,
  COMBINED_SAMPLING_DRAFTS_URL,
  type SamplingRequestType,
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
  type SendJob = {
    type: SamplingRequestType;
    requestId: string;
    done: boolean;
    sentCount: number;
  };
  const jobs = useRef<SendJob[] | null>(null);
  const { mutate } = useSWRConfig();
  const storageKey = `combinedSamplingSendRequest:${userId}`;
  const legacyKey = (type: SamplingRequestType) =>
    `receiptSamplingSendRequest:${userId}${type === "TP" ? ":TP" : ""}`;
  function persistJobs() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(jobs.current));
    } catch {
      /* Optional storage. */
    }
  }
  function clearRequest() {
    jobs.current = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional storage. */
    }
  }

  async function refreshSourceRecords(type: SamplingRequestType) {
    const url =
      type === "NL"
        ? WAREHOUSE_RECEIPT_ITEMS_URL
        : API_ROUTES.productionOrders.finishedProductSummaries;
    const firstPageKeys: unknown[][] = [];

    // Clear every cached filter/page, including lists that are currently unmounted.
    await mutate(
      (key) => {
        if (
          Array.isArray(key) &&
          key[0] === url &&
          key[3] === "record-infinite"
        ) {
          if (key[2] === 1) firstPageKeys.push(key);
          return true;
        }
        return (
          typeof key === "string" &&
          (key === url ||
            (key.startsWith(`${url}/`) &&
              /^\d+$/.test(key.slice(url.length + 1))) ||
            (type === "TP" &&
              /^\/production-orders\/\d+\/finished-product-summaries$/.test(
                key,
              )))
        );
      },
      undefined,
      { revalidate: true },
    ).catch(() => {});

    // SWR Infinite also keeps an aggregate cache, separate from its page entries.
    await Promise.allSettled(
      firstPageKeys.map((key) =>
        mutate(
          serializeInfiniteKey(() => key),
          undefined,
          { revalidate: true },
        ),
      ),
    );
  }

  async function send() {
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError("");
    try {
      if (!jobs.current) {
        try {
          const stored = JSON.parse(
            sessionStorage.getItem(storageKey) ?? "null",
          );
          if (
            Array.isArray(stored) &&
            stored.every(
              (job) =>
                ["NL", "TP"].includes(job.type) &&
                typeof job.requestId === "string" &&
                typeof job.done === "boolean" &&
                typeof job.sentCount === "number",
            )
          )
            jobs.current = stored;
        } catch {
          /* Optional storage. */
        }
        if (!jobs.current) {
          const types = await receiptSamplingDraftsService.pendingTypes();
          jobs.current = types.map((type) => {
            let previousId: string | null = null;
            try {
              previousId = sessionStorage.getItem(legacyKey(type));
            } catch {
              /* Optional storage. */
            }
            return {
              type,
              requestId: previousId || crypto.randomUUID(),
              done: false,
              sentCount: 0,
            };
          });
        }
        persistJobs();
      }
      // Each type retains its own durable server journal. Retrying never resends a completed group.
      for (const job of jobs.current) {
        if (job.done) continue;
        try {
          const result = await receiptSamplingDraftsService.send(
            job.requestId,
            job.type,
          );
          job.done = true;
          job.sentCount = result.sentCount;
          persistJobs();
          // Cache refresh errors must never turn a confirmed email into a resend.
          await refreshSourceRecords(job.type).catch(() => {});
          try {
            sessionStorage.removeItem(legacyKey(job.type));
          } catch {
            /* Optional storage. */
          }
        } catch (error) {
          if (
            isAxiosError(error) &&
            error.response?.data?.sendState === "failed"
          ) {
            job.requestId = crypto.randomUUID();
            persistJobs();
            try {
              sessionStorage.removeItem(legacyKey(job.type));
            } catch {
              /* Optional storage. */
            }
          }
          throw error;
        }
      }
      const sentCount = jobs.current.reduce(
        (total, job) => total + job.sentCount,
        0,
      );
      clearRequest();
      setSendState("");
      await mutate<RecordListPage<ReceiptSamplingDraft>>(
        (key) =>
          Array.isArray(key) &&
          [
            COMBINED_SAMPLING_DRAFTS_URL,
            samplingDraftListUrl("NL"),
            samplingDraftListUrl("TP"),
          ].includes(key[0]) &&
          key[4] === String(userId),
        (page) => (page ? { ...page, data: [], total: 0 } : page),
        { revalidate: false },
      ).catch(() => {});
      await mutate(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          key[1] === String(userId) &&
          (key[0].startsWith("/production-orders/") ||
            key[0].startsWith(`${WAREHOUSE_RECEIPT_ITEMS_URL}/`)) &&
          key[0].endsWith("/sampling-request-draft"),
        null,
        { revalidate: false },
      ).catch(() => {});
      toast.success(`Đã gửi email PYCLM cho ${sentCount} bản nháp.`);
      // Refresh failures must not turn a successful email into a resend action.
      await onSent().catch(() => {});
    } catch (error) {
      const data = isAxiosError(error) ? error.response?.data : undefined;
      const state = typeof data?.sendState === "string" ? data.sendState : "";
      setSendState(state);
      await onSent().catch(() => {});
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
        onClick={() => setConfirmOpen(true)}
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
              {sendState === "confirmed"
                ? "Bạn có muốn tiếp tục hoàn tất đợt gửi PYCLM? Các phiếu đã gửi sẽ không bị gửi lại email."
                : "Bạn có muốn gửi email PYCLM cho toàn bộ bản nháp nguyên liệu và thành phẩm của bạn? Thông tin gửi sẽ được lưu và các bản nháp của đợt gửi sẽ được xóa khi gửi thành công."}
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
