"use client";

import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Camera, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecordDetail,
  ProductionOrderWeighingRecordLine,
} from "../types";
import { formatWeight, normalizeWeight, sumWeights } from "../weight-utils";

export function WeighingRecordWeightTotal({
  line,
}: {
  line: ProductionOrderWeighingRecordLine;
}) {
  const details = line.details ?? [];
  if (!details.length) return <span className="text-slate-500">—</span>;
  const units = [...new Set(details.map((detail) => detail.unit))];
  return (
    <>
      {units.map((unit) => (
        <p key={unit}>
          {formatWeight(
            sumWeights(
              details
                .filter((detail) => detail.unit === unit)
                .map((detail) => detail.net_weight),
            ),
          )}
          {unit !== line.unit || units.length > 1 ? ` ${unit}` : ""}
        </p>
      ))}
    </>
  );
}

export default function WeighingRecordWeightCell({
  recordId,
  line,
  locked,
  onSaved,
}: {
  recordId: number;
  line: ProductionOrderWeighingRecordLine;
  locked: boolean;
  onSaved: (detail: ProductionOrderWeighingRecordDetail) => Promise<unknown>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const details = [...(line.details ?? [])].sort((a, b) => a.id - b.id);

  const chooseImages = (files: File[]) => {
    if (!files.length) return;
    for (const file of files) {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        )
      ) {
        setError("Chọn ảnh JPG, PNG, WEBP hoặc GIF.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("Ảnh tối đa 20 MB.");
        return;
      }
    }
    if (images.length + files.length > 20) {
      setError("Mỗi lần tải lên tối đa 20 ảnh.");
      return;
    }
    setImages((current) => [...current, ...files]);
    setError("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current || locked) return;
    const normalized = normalizeWeight(weight, true);
    if (!normalized) {
      setError(
        "Nhập khối lượng khác 0 (có thể âm), tối đa 12 chữ số nguyên và 6 chữ số thập phân.",
      );
      inputRef.current?.focus();
      return;
    }
    busyRef.current = true;
    setIsSaving(true);
    setError("");
    try {
      const detail = await service.createWeighingDetail(
        recordId,
        line.id,
        normalized,
        { note: note.trim() || null, images },
      );
      await onSaved(detail);
      setWeight("");
      setNote("");
      setImages([]);
      setIsOpen(false);
      toast.success("Đã lưu khối lượng thực tế.");
    } catch (error) {
      const message: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setError(
        typeof message === "string"
          ? message
          : "Không thể lưu khối lượng thực tế. Vui lòng thử lại.",
      );
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1 ${details.length === 0 ? "justify-center" : ""}`}
      >
        {details.map((detail, index) => (
          <span key={detail.id} className="inline-flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">+</span> : null}
            <span
              className="font-medium tabular-nums"
              title={`Lần ${index + 1} · ${detail.weighedBy?.name || detail.weighedBy?.username || ""} · ${new Date(detail.weighed_at).toLocaleString("vi-VN")}`}
            >
              {formatWeight(detail.net_weight)}
              {detail.unit !== line.unit ? ` ${detail.unit}` : ""}
            </span>
          </span>
        ))}
        {!locked ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
            aria-label={`Thêm lần cân cho ${line.item_code}, dòng ${line.id}`}
            title="Thêm lần cân"
            onClick={() => {
              setWeight("");
              setNote("");
              setImages([]);
              setError("");
              setIsOpen(true);
            }}
          >
            <Plus className="size-4" />
          </Button>
        ) : !details.length ? (
          <span className="text-slate-500">—</span>
        ) : null}
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!busyRef.current) setIsOpen(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập khối lượng thực tế</DialogTitle>
            <DialogDescription>
              {line.item_code} — {line.item_name}
              {line.lot_no ? ` · Lô ${line.lot_no}` : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor={`weighing-weight-${line.id}`}
                className="text-sm font-medium"
              >
                Khối lượng lần cân ({line.unit})
              </label>
              <Input
                id={`weighing-weight-${line.id}`}
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={weight}
                disabled={isSaving || locked}
                required
                maxLength={20}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `weight-error-${line.id}` : undefined}
                onChange={(event) => {
                  setWeight(event.target.value);
                  setError("");
                }}
                placeholder="Nhập khối lượng"
              />
              {error ? (
                <p
                  id={`weight-error-${line.id}`}
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {error}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`weighing-note-${line.id}`}
                className="text-sm font-medium"
              >
                Ghi chú
              </label>
              <Textarea
                id={`weighing-note-${line.id}`}
                value={note}
                rows={3}
                disabled={isSaving || locked}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Nhập ghi chú (tùy chọn)"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Hình ảnh (tùy chọn)</p>
              <input
                ref={cameraRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                className="hidden"
                disabled={isSaving || locked}
                onChange={(event) => {
                  chooseImages(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={isSaving || locked}
                onChange={(event) => {
                  chooseImages(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || locked}
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="size-4" />
                  Chụp ảnh
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || locked}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  Chọn ảnh
                </Button>
              </div>
              {images.map((image, index) => (
                <div
                  key={`${image.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 break-words">{image.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isSaving || locked}
                    onClick={() =>
                      setImages((current) =>
                        current.filter((_, position) => position !== index),
                      )
                    }
                    aria-label="Bỏ ảnh đã chọn"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSaving || locked || !weight.trim()}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isSaving ? "Đang lưu..." : "Lưu lần cân"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
