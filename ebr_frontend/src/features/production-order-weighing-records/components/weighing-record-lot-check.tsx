"use client";

import { useState } from "react";
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
  const save = async (isCorrect: boolean) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const check = await service.checkLot(recordId, line.id, lotNo, isCorrect);
      await onSaved(check);
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
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kiểm tra số lô</DialogTitle>
            <DialogDescription>
              {line.item_code} — {line.item_name}
            </DialogDescription>
          </DialogHeader>
          <p>
            Số lô <strong>{lotNo}</strong> có đúng không?
          </p>
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
