"use client";

import { useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import receiptAttachmentsService from "@/services/warehouse-receipt-attachments.service";
import {
  WAREHOUSE_RECEIPT_ITEMS_URL,
  type WarehouseReceiptItem,
} from "@/services/warehouse-receipt-items.service";
import {
  emptyReceiptImages,
  RECEIPT_ATTACHMENT_GROUPS,
  validateReceiptImages,
} from "./receipt-attachments";
import { receiptImageError } from "./receipt-form";
import ReceiptImagePicker from "./receipt-image-picker";

type Upload = (typeof RECEIPT_ATTACHMENT_GROUPS)[number] & {
  receiptId: number;
};
type UploadFailure = Upload & { message: string };

export default function BatchReceiptImagesButton({
  ids,
  cacheScope,
  onUploaded,
  onFinish,
}: {
  ids: ReadonlySet<number>;
  cacheScope: string;
  onUploaded: () => void;
  onFinish: () => void;
}) {
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState(emptyReceiptImages);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const saving = useRef(false);
  const groups = RECEIPT_ATTACHMENT_GROUPS.filter(
    ({ type }) => files[type].length > 0,
  );

  function changeOpen(next: boolean) {
    if (saving.current) return;
    setOpen(next);
    if (!next) {
      if (hasUploaded) onFinish();
      setFiles(emptyReceiptImages());
      setFailures([]);
      setHasUploaded(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !ids.size || !groups.length) return;
    for (const { type } of groups) {
      const error = validateReceiptImages(files[type]);
      if (error) {
        toast.error(error);
        return;
      }
    }

    const uploads: Upload[] = hasUploaded
      ? failures
      : Array.from(ids).flatMap((receiptId) =>
          groups.map((group) => ({ ...group, receiptId })),
        );
    saving.current = true;
    setProgress({ done: 0, total: uploads.length });
    const failed: UploadFailure[] = [];
    let completed = 0;
    try {
      for (const upload of uploads) {
        const { receiptId, type } = upload;
        try {
          const images = await receiptAttachmentsService.upload(
            receiptId,
            type,
            files[type],
          );
          completed++;
          void mutate<WarehouseReceiptItem>(
            [`${WAREHOUSE_RECEIPT_ITEMS_URL}/${receiptId}`, cacheScope],
            (current) =>
              current && {
                ...current,
                attachments: [...(current.attachments ?? []), ...images],
              },
            { revalidate: false },
          ).catch(() => {});
        } catch (error) {
          failed.push({ ...upload, message: receiptImageError(error) });
        }
        setProgress(
          (current) => current && { ...current, done: current.done + 1 },
        );
      }
      setFailures(failed);
      if (completed) {
        setHasUploaded(true);
        onUploaded();
      }
      if (!failed.length) {
        toast.success(`Đã lưu ảnh chứng từ cho ${ids.size} dòng nhập kho.`);
        setOpen(false);
        onFinish();
      }
    } finally {
      saving.current = false;
      setProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!ids.size}>
          <Camera className="size-4" /> Chụp ảnh
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!progress}
      >
        <DialogHeader>
          <DialogTitle>Chụp ảnh chứng từ nhập kho</DialogTitle>
          <DialogDescription>
            Các ảnh đã chọn sẽ được thêm vào cả {ids.size} dòng nhập kho.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {RECEIPT_ATTACHMENT_GROUPS.map(({ type, label }) => (
            <ReceiptImagePicker
              key={type}
              label={label}
              files={files[type]}
              images={[]}
              disabled={Boolean(progress) || hasUploaded}
              onChange={(next) => {
                setFiles((current) => ({ ...current, [type]: next }));
                setFailures([]);
              }}
            />
          ))}
          {progress ? (
            <p role="status" className="text-sm text-gray-600">
              Đã xử lý {progress.done}/{progress.total} lượt tải ảnh.
            </p>
          ) : (
            failures.length > 0 && (
              <div role="alert" className="space-y-1 text-sm text-red-600">
                <p>Còn {failures.length} lượt tải ảnh chưa thành công.</p>
                <ul className="max-h-32 list-disc overflow-y-auto pl-5">
                  {failures.map(({ receiptId, type, label, message }) => (
                    <li key={`${receiptId}-${type}`}>
                      Dòng #{receiptId} · {label}: {message}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(progress)}
              onClick={() => changeOpen(false)}
            >
              {hasUploaded ? "Đóng" : "Hủy"}
            </Button>
            <Button
              type="submit"
              disabled={Boolean(progress) || !groups.length}
            >
              {progress
                ? "Đang lưu..."
                : failures.length
                  ? "Thử lại"
                  : "Lưu ảnh"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
