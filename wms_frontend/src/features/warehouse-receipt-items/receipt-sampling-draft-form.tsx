"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { FileInput } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const FINISHED_PRODUCT_SAMPLING_LOCATIONS = [
  "Kho TP Thuốc",
  "Kho TP Mỹ phẩm",
  "Kho TP TTBYT",
  "Kho TP TPVBSK",
  "Kho TP TPBS",
];

type Props = {
  receipt: Pick<WarehouseReceiptItem, "id">;
  requestType?: SamplingRequestType;
  onSaved: () => void;
  onCancel: () => void;
  onSubmittingChange: (saving: boolean) => void;
};

export function BatchSamplingDraftButton({
  ids,
  requestType,
  onSaved,
  disabled,
}: {
  ids: readonly number[];
  requestType: SamplingRequestType;
  onSaved: () => void;
  disabled?: boolean;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const [open, setOpen] = useState(false);
  const saving = useRef(false);
  const typeLabel = requestType === "TP" ? "thành phẩm" : "nguyên liệu";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving.current) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled || !userId || !ids.length}>
          <FileInput className="size-4" /> Soạn PYCLM
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Soạn PYCLM {typeLabel}</DialogTitle>
          <DialogDescription>
            Dùng chung vị trí lấy mẫu cho {ids.length}{" "}
            {requestType === "TP" ? "lệnh sản xuất" : "dòng nhập kho"}. Nếu đã
            có bản nháp của bạn, vị trí lấy mẫu sẽ được cập nhật.
          </DialogDescription>
        </DialogHeader>
        {open && userId && (
          <DraftEditor
            key={userId}
            ids={ids}
            batch
            requestType={requestType}
            userId={userId}
            onSubmittingChange={(submitting) => {
              saving.current = submitting;
            }}
            onCancel={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

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
      ids={[props.receipt.id]}
      requestType={requestType}
      onSaved={props.onSaved}
      onCancel={props.onCancel}
      onSubmittingChange={props.onSubmittingChange}
      userId={userId}
      initialLocation={data?.location ?? ""}
    />
  );
}

function DraftEditor({
  ids,
  batch = false,
  initialLocation = "",
  onSaved,
  onCancel,
  onSubmittingChange,
  requestType = "NL",
  userId,
}: Omit<Props, "receipt"> & {
  ids: readonly number[];
  batch?: boolean;
  initialLocation?: string;
  userId: number;
}) {
  const fieldId = useId();
  const submitting = useRef(false);
  const [pendingIds, setPendingIds] = useState(() => Array.from(new Set(ids)));
  const [failures, setFailures] = useState<{ id: number; message: string }[]>(
    [],
  );
  const samplingLocations =
    requestType === "TP"
      ? FINISHED_PRODUCT_SAMPLING_LOCATIONS
      : SAMPLING_LOCATIONS;
  const [location, setLocation] = useState(
    samplingLocations.includes(initialLocation) ? initialLocation : "",
  );
  const [saving, setSaving] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !pendingIds.length) return;
    if (!samplingLocations.includes(location)) {
      setError("Vui lòng chọn vị trí lấy mẫu.");
      return;
    }
    setError("");
    setFailures([]);
    setProcessedCount(0);
    submitting.current = true;
    setSaving(true);
    onSubmittingChange(true);
    try {
      const failed: typeof failures = [];
      for (const id of pendingIds) {
        try {
          const saved = await receiptSamplingDraftsService.save(
            id,
            location,
            requestType,
          );
          void mutate(
            receiptSamplingDraftCacheKey(id, userId, requestType),
            saved,
            {
              revalidate: false,
            },
          ).catch(() => {});
        } catch (error) {
          failed.push({
            id,
            message: receiptError(error, "Không thể lưu bản nháp PYCLM."),
          });
        }
        if (batch) setProcessedCount((count) => count + 1);
      }
      const savedCount = pendingIds.length - failed.length;
      if (savedCount) {
        void refreshItemCatalog(samplingDraftListUrl(requestType)).catch(
          () => {},
        );
        void refreshItemCatalog(COMBINED_SAMPLING_DRAFTS_URL).catch(() => {});
        toast.success(
          batch
            ? `Đã lưu ${savedCount} bản nháp PYCLM.`
            : "Đã lưu bản nháp PYCLM.",
        );
      }
      if (!failed.length) {
        onSaved();
      } else if (batch) {
        setPendingIds(failed.map(({ id }) => id));
        setFailures(failed);
      } else {
        setError(failed[0].message);
      }
    } finally {
      submitting.current = false;
      setSaving(false);
      onSubmittingChange(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={fieldId}>
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
            id={fieldId}
            className="w-full"
            aria-describedby={error ? `${fieldId}-error` : undefined}
            aria-invalid={Boolean(error)}
          >
            <SelectValue placeholder="Chọn vị trí lấy mẫu" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            {samplingLocations.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      )}
      {failures.length > 0 && (
        <div role="alert" className="space-y-1 text-sm text-red-600">
          <p>
            Không lưu được {failures.length} bản nháp. Khi thử lại, chỉ các dòng
            sau được lưu lại:
          </p>
          <ul className="max-h-32 list-disc overflow-y-auto pl-5">
            {failures.map(({ id, message }) => (
              <li key={id}>
                #{id} · {message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {batch && saving && (
        <p role="status" className="text-sm text-muted-foreground">
          Đã xử lý {processedCount}/{pendingIds.length} bản nháp
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
          {saving ? "Đang lưu..." : failures.length ? "Thử lại" : "Lưu nháp"}
        </Button>
      </div>
    </form>
  );
}
