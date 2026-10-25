"use client";

import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Edit2, EllipsisVertical, Loader2, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecordLine,
  UpdateWeighingRecordLinePayload,
} from "../types";
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
  const [form, setForm] = useState({
    code: "",
    name: "",
    lot: "",
    quantity: "",
    unit: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const open = (next: "edit" | "delete") => {
    setForm({
      code: line.item_code,
      name: line.item_name,
      lot: line.lot_no ?? "",
      quantity: line.planned_quantity,
      unit: line.unit,
      note: line.note ?? "",
    });
    setError("");
    setMode(next);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current || disabled || !mode) return;
    const quantity = normalizeWeight(form.quantity);
    if (
      mode === "edit" &&
      (!form.code.trim() || !form.name.trim() || !form.unit.trim() || !quantity)
    ) {
      setError(
        "Nhập mã, tên, đơn vị và lượng yêu cầu lớn hơn 0, tối đa 6 chữ số thập phân.",
      );
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
        const next = {
          item_code: form.code.trim(),
          item_name: form.name.trim(),
          lot_no: form.lot.trim() || null,
          planned_quantity: quantity!,
          unit: form.unit.trim(),
          note: form.note.trim() || null,
        };
        const payload: UpdateWeighingRecordLinePayload = {};
        if (next.item_code !== line.item_code)
          payload.item_code = next.item_code;
        if (next.item_name !== line.item_name)
          payload.item_name = next.item_name;
        if (next.lot_no !== line.lot_no) payload.lot_no = next.lot_no;
        if (next.planned_quantity !== line.planned_quantity)
          payload.planned_quantity = next.planned_quantity;
        if (next.unit !== line.unit) payload.unit = next.unit;
        if (next.note !== line.note) payload.note = next.note;
        if (Object.keys(payload).length) {
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
  const field = (name: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const inputClass = "flex flex-col gap-2";

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
                : "Cập nhật thông tin nguyên liệu trong phiếu cân."}
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
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={inputClass}>
                    <label htmlFor={`material-code-${line.id}`}>
                      Mã nguyên liệu
                    </label>
                    <Input
                      id={`material-code-${line.id}`}
                      value={form.code}
                      required
                      maxLength={255}
                      disabled={isSubmitting || disabled}
                      onChange={(event) => field("code", event.target.value)}
                    />
                  </div>
                  <div className={inputClass}>
                    <label htmlFor={`material-lot-${line.id}`}>Số lô</label>
                    <Input
                      id={`material-lot-${line.id}`}
                      value={form.lot}
                      maxLength={255}
                      disabled={isSubmitting || disabled}
                      onChange={(event) => field("lot", event.target.value)}
                    />
                  </div>
                </div>
                <div className={inputClass}>
                  <label htmlFor={`material-name-${line.id}`}>
                    Tên nguyên liệu
                  </label>
                  <Input
                    id={`material-name-${line.id}`}
                    value={form.name}
                    required
                    maxLength={255}
                    disabled={isSubmitting || disabled}
                    onChange={(event) => field("name", event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={inputClass}>
                    <label htmlFor={`material-quantity-${line.id}`}>
                      Lượng yêu cầu
                    </label>
                    <Input
                      id={`material-quantity-${line.id}`}
                      value={form.quantity}
                      inputMode="decimal"
                      required
                      maxLength={19}
                      disabled={isSubmitting || disabled}
                      onChange={(event) =>
                        field("quantity", event.target.value)
                      }
                    />
                  </div>
                  <div className={inputClass}>
                    <label htmlFor={`material-unit-${line.id}`}>Đơn vị</label>
                    <Input
                      id={`material-unit-${line.id}`}
                      value={form.unit}
                      required
                      maxLength={50}
                      disabled={isSubmitting || disabled}
                      onChange={(event) => field("unit", event.target.value)}
                    />
                  </div>
                </div>
                <div className={inputClass}>
                  <label htmlFor={`material-note-${line.id}`}>Ghi chú</label>
                  <Textarea
                    id={`material-note-${line.id}`}
                    value={form.note}
                    rows={3}
                    disabled={isSubmitting || disabled}
                    onChange={(event) => field("note", event.target.value)}
                  />
                </div>
              </>
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
