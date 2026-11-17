"use client";

import { useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { refreshItemCatalog } from "@/lib/item-catalog-refresh";
import type { WarehouseReceiptItem } from "@/services/warehouse-receipt-items.service";
import {
  samplingDraftListUrl,
  COMBINED_SAMPLING_DRAFTS_URL,
  type SamplingRequestType,
  receiptSamplingDraftsService,
  receiptSamplingDraftCacheKey,
} from "@/services/warehouse-receipt-sampling-drafts.service";
import { receiptError } from "./receipt-form";
import useUserStore from "@/store/user.store";

const SAMPLING_LOCATIONS = [
  "Kho NL TPBVSK",
  "Kho NL Thuốc",
  "Kho NL TTBYT",
  "Kho NL Mỹ Phẩm",
  "Kho Dược liệu",
  "Kho Dược Liệu Thuốc",
  "Kho BBC1 TPBVSK",
  "Kho BBC1 Thuốc",
  "Kho BBC1 Mỹ Phẩm",
  "Kho BBC1 TTBYT",
  "Kho BBC2 TPBVSK",
  "Kho BBC2 Thuốc",
  "Kho BBC2 Mỹ Phẩm",
  "Kho BBC2 TTBYT",
];

type Props = {
  receipt: Pick<WarehouseReceiptItem, "id">;
  requestType?: SamplingRequestType;
  onSaved: () => void;
  onCancel: () => void;
  onSubmittingChange: (saving: boolean) => void;
};

export default function ReceiptSamplingDraftForm(props: Props) {
  const requestType = props.requestType ?? "NL";
  const userId = useUserStore((state) => state.user?.id);
  const { data, error, isLoading, mutate } = useSWR(
    userId
      ? receiptSamplingDraftCacheKey(props.receipt.id, userId, requestType)
      : null,
    () => receiptSamplingDraftsService.read(props.receipt.id, requestType),
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
  if (!userId || isLoading)
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
  return (
    <DraftEditor
      key={userId}
      {...props}
      userId={userId}
      initialLocation={data?.location ?? ""}
    />
  );
}

function DraftEditor({
  receipt,
  initialLocation,
  onSaved,
  onCancel,
  onSubmittingChange,
  requestType = "NL",
  userId,
}: Props & { initialLocation: string; userId: number }) {
  const [location, setLocation] = useState(
    SAMPLING_LOCATIONS.includes(initialLocation) ? initialLocation : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!SAMPLING_LOCATIONS.includes(location)) {
      setError("Vui lòng chọn vị trí lấy mẫu.");
      return;
    }
    setError("");
    setSaving(true);
    onSubmittingChange(true);
    try {
      const saved = await receiptSamplingDraftsService.save(
        receipt.id,
        location.trim(),
        requestType,
      );
      await mutate(
        receiptSamplingDraftCacheKey(receipt.id, userId, requestType),
        saved,
        {
          revalidate: false,
        },
      );
      void refreshItemCatalog(samplingDraftListUrl(requestType)).catch(
        () => {},
      );
      void refreshItemCatalog(COMBINED_SAMPLING_DRAFTS_URL).catch(() => {});
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
        <Select
          value={location}
          onValueChange={(value) => {
            setLocation(value);
            setError("");
          }}
          required
          disabled={saving}
        >
          <SelectTrigger
            id="sampling-location"
            className="w-full"
            aria-describedby={error ? "sampling-draft-error" : undefined}
            aria-invalid={Boolean(error)}
          >
            <SelectValue placeholder="Chọn vị trí lấy mẫu" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            {SAMPLING_LOCATIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
