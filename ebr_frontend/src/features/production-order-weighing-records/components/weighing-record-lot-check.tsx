"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import AuthenticatedImage from "@/components/authenticated-image/authenticated-image";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
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
  ProductionOrderWeighingRecordLine,
  WeighingRecordLotCheck,
} from "../types";

export default function WeighingRecordLotCheckButton({
  recordId,
  line,
  onSaved,
}: {
  recordId: number;
  line: ProductionOrderWeighingRecordLine;
  onSaved: (check: WeighingRecordLotCheck) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const chooseImages = (files: File[]) => {
    if (!files.length) return;
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.type,
          ),
      )
    ) {
      setError("Chọn ảnh JPG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (files.some((file) => file.size > 20 * 1024 * 1024)) {
      setError("Ảnh tối đa 20 MB.");
      return;
    }
    if (images.length + files.length > 20) {
      setError("Mỗi lần tải lên tối đa 20 ảnh.");
      return;
    }
    setImages((current) => [...current, ...files]);
    setError("");
  };
  const save = async (isCorrect: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setError("");
    try {
      const check = await service.checkLot(
        recordId,
        line.id,
        lotNo,
        isCorrect,
        images,
      );
      await onSaved(check);
      setImages([]);
      setOpen(false);
    } catch (err) {
      const detail: unknown = isAxiosError(err)
        ? err.response?.data?.message
        : null;
      setError(
        typeof detail === "string"
          ? detail
          : "Không thể lưu kết quả kiểm tra số lô.",
      );
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };
  const deleteImage = async (imageId: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSaved(
        await service.deleteLotCheckImage(recordId, line.id, imageId),
      );
    } catch {
      setError("Không thể xóa ảnh kiểm tra số lô.");
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };
  if (!line.lot_no) return <span>—</span>;
  const status = line.lotCheck;
  return (
    <>
      <button
        type="button"
        className={`cursor-pointer rounded-sm text-left underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 print:no-underline ${status ? (status.is_correct ? "font-semibold text-green-600" : "font-semibold text-red-600") : ""}`}
        title={
          status
            ? status.is_correct
              ? "Số lô đúng"
              : "Số lô sai"
            : "Kiểm tra số lô"
        }
        aria-label={`Kiểm tra số lô ${line.lot_no} của ${line.item_code}`}
        onClick={() => {
          setLotNo(line.lot_no!);
          setError("");
          setImages([]);
          setOpen(true);
        }}
      >
        {line.lot_no}
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!saving) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kiểm tra số lô</DialogTitle>
            <DialogDescription>
              {line.item_code} — {line.item_name}
            </DialogDescription>
          </DialogHeader>
          <p>
            Số lô <strong>{lotNo}</strong> có đúng không?
          </p>
          <div className="space-y-3">
            <p className="text-sm font-medium">Hình ảnh kiểm tra số lô</p>
            {status?.images?.length ? (
              <div className="grid grid-cols-2 gap-3">
                {status.images.map((image, index) => (
                  <div key={image.id} className="relative rounded border p-1">
                    <AuthenticatedImage
                      src={image.image_path}
                      alt={`Ảnh kiểm tra số lô ${lotNo}, ảnh ${index + 1}`}
                      previewTitle={`Kiểm tra số lô ${lotNo}`}
                      width={180}
                      height={140}
                      className="h-32 w-full rounded"
                      objectFit="contain"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="absolute top-1 right-1"
                      disabled={saving}
                      aria-label={`Xóa ảnh ${index + 1}`}
                      onClick={() => void deleteImage(image.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={cameraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              className="hidden"
              disabled={saving}
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
              disabled={saving}
              onChange={(event) => {
                chooseImages(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="size-4" />
                Chụp ảnh
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
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
                  disabled={saving}
                  aria-label="Bỏ ảnh đã chọn"
                  onClick={() =>
                    setImages((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Ảnh mới được lưu khi chọn Đúng hoặc Sai.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button
              className="w-full bg-black text-white hover:bg-black/90"
              disabled={saving}
              onClick={() => void save(false)}
            >
              Sai
            </Button>
            <Button
              className="w-full bg-black text-white hover:bg-black/90"
              disabled={saving}
              onClick={() => void save(true)}
            >
              {saving ? "Đang lưu..." : "Đúng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
