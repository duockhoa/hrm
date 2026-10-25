"use client";

import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Edit2, EllipsisVertical, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import service from "@/services/production-order-weighing-records.service";
import type { ProductionOrderWeighingRecordLine } from "../types";
import { normalizeWeight } from "../weight-utils";

export default function WeighingRecordMaterialMenu({
  recordId,
  line,
  disabled,
  onUpdated,
  onDeleted,
}: {
  recordId: number;
  line: ProductionOrderWeighingRecordLine;
  disabled: boolean;
  onUpdated: (updated: ProductionOrderWeighingRecordLine) => Promise<unknown>;
  onDeleted: () => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const open = (next: "edit" | "delete") => {
    setQuantityInput(line.planned_quantity);
    setError("");
    setMode(next);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current || disabled || !mode) return;
    const quantity = normalizeWeight(quantityInput);
    if (mode === "edit" && !quantity) {
      setError("Nhập lượng yêu cầu lớn hơn 0, tối đa 6 chữ số thập phân.");
      return;
    }
    busyRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      if (mode === "delete") {
        await service.deleteLine(recordId, line.id);
        await onDeleted();
        toast.success("Đã xóa nguyên liệu khỏi phiếu cân.");
      } else {
        if (quantity !== normalizeWeight(line.planned_quantity)) {
          const payload = { planned_quantity: quantity! };
          await onUpdated(await service.updateLine(recordId, line.id, payload));
          toast.success("Đã cập nhật nguyên liệu.");
        }
      }
      setMode(null);
    } catch (error) {
      const detail: unknown = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.join("; ")
            : "Không thể cập nhật nguyên liệu. Vui lòng thử lại.",
      );
    } finally {
      busyRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || isSubmitting}
            className="shrink-0 text-slate-700"
            aria-label={`Thao tác nguyên liệu ${line.item_code}, dòng ${line.id}`}
            title="Thao tác nguyên liệu"
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="font-sans">
          <DropdownMenuItem onSelect={() => open("edit")}>
            <Edit2 className="size-4" />
            Sửa
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => open("delete")}
          >
            <Trash2 className="size-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !busyRef.current) setMode(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto font-sans sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "delete" ? "Xóa nguyên liệu" : "Sửa nguyên liệu"}
            </DialogTitle>
            <DialogDescription>
              {mode === "delete"
                ? "Nguyên liệu và toàn bộ các lần cân, hình ảnh gắn với dòng này sẽ bị xóa khỏi phiếu cân. Thao tác này không thể hoàn tác."
                : `${line.item_code} — ${line.item_name} · Số lô: ${line.lot_no || "—"}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 text-sm">
            {mode === "delete" ? (
              <div className="rounded border bg-slate-50 p-3">
                <p className="break-words font-semibold">
                  {line.item_code} — {line.item_name}
                </p>
                <p className="mt-1 text-slate-600">
                  Số lô: {line.lot_no || "—"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label htmlFor={`material-quantity-${line.id}`}>
                  Lượng yêu cầu ({line.unit})
                </label>
                <Input
                  id={`material-quantity-${line.id}`}
                  value={quantityInput}
                  inputMode="decimal"
                  required
                  maxLength={19}
                  disabled={isSubmitting || disabled}
                  onChange={(event) => setQuantityInput(event.target.value)}
                />
              </div>
            )}
            {error ? (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setMode(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant={mode === "delete" ? "destructive" : "default"}
                disabled={isSubmitting || disabled}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : mode === "delete" ? (
                  <Trash2 className="size-4" />
                ) : (
                  <Edit2 className="size-4" />
                )}
                {isSubmitting
                  ? "Đang lưu..."
                  : mode === "delete"
                    ? "Xóa nguyên liệu"
                    : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
