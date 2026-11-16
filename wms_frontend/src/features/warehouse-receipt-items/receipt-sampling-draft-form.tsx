"use client";

import { useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import type { WarehouseReceiptItem } from "@/services/warehouse-receipt-items.service";
import {
  RECEIPT_SAMPLING_DRAFTS_URL,
  receiptSamplingDraftsService,
  receiptSamplingDraftUrl,
} from "@/services/warehouse-receipt-sampling-drafts.service";
import { receiptError } from "./receipt-form";

type Props = {
  receipt: WarehouseReceiptItem;
  onSaved: () => void;
  onCancel: () => void;
  onSubmittingChange: (saving: boolean) => void;
};

export default function ReceiptSamplingDraftForm(props: Props) {
  const { data, error, isLoading, mutate } = useSWR(
    receiptSamplingDraftUrl(props.receipt.id),
    () => receiptSamplingDraftsService.read(props.receipt.id),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  if (error)
    return (
      <div role="alert" className="text-sm text-red-600">
        Không thể tải bản nháp PYCLM.
        <Button
          type="button"
          variant="link"
          onClick={() => void mutate().catch(() => {})}
        >
          Thử lại
        </Button>
      </div>
    );
  if (isLoading)
    return (
      <div
        role="status"
        aria-label="Đang tải bản nháp PYCLM"
        className="space-y-3"
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
    );
  return <DraftEditor {...props} initialLocation={data?.location ?? ""} />;
}

function DraftEditor({
  receipt,
  initialLocation,
  onSaved,
  onCancel,
  onSubmittingChange,
}: Props & { initialLocation: string }) {
  const [location, setLocation] = useState(initialLocation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!location.trim()) {
      setError("Vui lòng nhập vị trí lấy mẫu.");
      return;
    }
    setError("");
    setSaving(true);
    onSubmittingChange(true);
    try {
      const saved = await receiptSamplingDraftsService.save(
        receipt.id,
        location.trim(),
      );
      await mutate(receiptSamplingDraftUrl(receipt.id), saved, {
        revalidate: false,
      });
      void refreshItemCatalog(RECEIPT_SAMPLING_DRAFTS_URL).catch(() => {});
      toast.success("Đã lưu bản nháp PYCLM.");
      onSaved();
    } catch (error) {
      setError(receiptError(error, "Không thể lưu bản nháp PYCLM."));
    } finally {
      setSaving(false);
      onSubmittingChange(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sampling-location">
          Vị trí lấy mẫu <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="sampling-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          required
          maxLength={191}
          disabled={saving}
          placeholder="Nhập vị trí lấy mẫu"
          aria-describedby={error ? "sampling-draft-error" : undefined}
        />
      </div>
      {error && (
        <p
          id="sampling-draft-error"
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu nháp"}
        </Button>
      </div>
    </form>
  );
}
