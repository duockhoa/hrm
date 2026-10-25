"use client";

import { useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import service from "@/services/production-order-weighing-records.service";
import type {
  ProductionOrderWeighingRecordDetail,
  ProductionOrderWeighingRecordLine,
} from "../types";
import { formatWeight, normalizeWeight, sumWeights } from "../weight-utils";

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
  const [weight, setWeight] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const details = [...(line.details ?? [])].sort((a, b) => a.id - b.id);
  const units = [...new Set(details.map((detail) => detail.unit))];

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current || locked) return;
    const normalized = normalizeWeight(weight);
    if (!normalized) {
      setError(
        "Nhập khối lượng lớn hơn 0, tối đa 12 chữ số nguyên và 6 chữ số thập phân.",
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
      );
      await onSaved(detail);
      setWeight("");
      toast.success("Đã lưu khối lượng thực tế.");
      inputRef.current?.focus();
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
    <div className="space-y-2">
      {details.length ? (
        <>
          <ol className="space-y-1 text-sm">
            {details.map((detail, index) => (
              <li
                key={detail.id}
                className="flex justify-between gap-2"
                title={`${detail.weighedBy?.name || detail.weighedBy?.username || ""} · ${new Date(detail.weighed_at).toLocaleString("vi-VN")}`}
              >
                <span>Lần {index + 1}:</span>
                <span className="font-medium tabular-nums">
                  {formatWeight(detail.net_weight)} {detail.unit}
                </span>
              </li>
            ))}
          </ol>
          <div className="border-t border-slate-200 pt-1 text-right text-sm font-bold tabular-nums">
            {units.map((unit) => (
              <p key={unit}>
                Tổng:{" "}
                {formatWeight(
                  sumWeights(
                    details
                      .filter((detail) => detail.unit === unit)
                      .map((detail) => detail.net_weight),
                  ),
                )}{" "}
                {unit}
              </p>
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-slate-500">Chưa cân</p>
      )}
      {!locked ? (
        <form onSubmit={save} className="flex items-center gap-1 font-sans">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={weight}
            disabled={isSaving}
            required
            maxLength={19}
            aria-label={`Khối lượng lần cân tiếp theo của ${line.item_code}, lô ${line.lot_no || "chưa có"}, dòng ${line.id}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `weight-error-${line.id}` : undefined}
            onChange={(event) => {
              setWeight(event.target.value);
              setError("");
            }}
            placeholder={`Nhập lần cân (${line.unit})`}
            className="h-8 min-w-0 text-sm"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon-sm"
            disabled={isSaving || !weight.trim()}
            aria-label={`Lưu lần cân cho ${line.item_code}, dòng ${line.id}`}
            title="Lưu lần cân"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p
          id={`weight-error-${line.id}`}
          role="alert"
          className="font-sans text-xs text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
