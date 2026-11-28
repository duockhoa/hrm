"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import service, {
  type VerificationDefect,
  type VerificationDefectInput,
  verificationDefectLabels,
} from "@/services/warehouse-verification-records.service";
import { verificationError } from "./verification-record-format";

type DefectAction =
  { type: "add" } | { type: "edit" | "delete"; defect: VerificationDefect };

export default function VerificationDefectDialog({
  recordId,
  action,
  onClose,
  onSaved,
}: {
  recordId: number;
  action: DefectAction;
  onClose: () => void;
  onSaved: (defect: VerificationDefect | null, removedId?: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const defect = "defect" in action ? action.defect : undefined;
  const deleting = action.type === "delete";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const readText = (name: string) => String(form.get(name) ?? "").trim();
    setError("");
    if (deleting && defect) {
      setBusy(true);
      try {
        await service.deleteDefect(recordId, defect.id);
        toast.success("Đã xóa chi tiết lỗi.");
        onSaved(null, defect.id);
      } catch (error) {
        setError(verificationError(error, "Không thể xóa chi tiết lỗi."));
      } finally {
        setBusy(false);
      }
      return;
    }

    const payload: VerificationDefectInput = {
      verified_quantity: readText("verified_quantity").replace(",", "."),
      defect_quantity: readText("defect_quantity").replace(",", "."),
      defect_description: readText("defect_description"),
      defect_type: readText(
        "defect_type",
      ) as VerificationDefectInput["defect_type"],
      proposed_action: readText("proposed_action") || null,
      note: readText("note") || null,
    };
    const validQuantity = /^\d{1,9}(?:\.\d{1,3})?$/;
    if (
      !validQuantity.test(payload.verified_quantity) ||
      !validQuantity.test(payload.defect_quantity) ||
      Number(payload.verified_quantity) <= 0 ||
      Number(payload.defect_quantity) > Number(payload.verified_quantity)
    ) {
      setError(
        "Số lượng xác minh phải lớn hơn 0 và số lượng lỗi không được vượt số lượng xác minh. Mỗi số được nhập tối đa 3 chữ số thập phân.",
      );
      return;
    }
    if (!payload.defect_description) {
      setError("Nhập lỗi phát hiện.");
      return;
    }

    setBusy(true);
    try {
      const saved = defect
        ? await service.updateDefect(recordId, defect.id, payload)
        : await service.createDefect(recordId, payload);
      toast.success(
        defect ? "Đã cập nhật chi tiết lỗi." : "Đã thêm chi tiết lỗi.",
      );
      onSaved(saved);
    } catch (error) {
      setError(verificationError(error, "Không thể lưu chi tiết lỗi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      showCloseButton={!busy}
      onInteractOutside={(event) => {
        if (busy) event.preventDefault();
      }}
      onEscapeKeyDown={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {deleting
            ? "Xóa chi tiết lỗi"
            : defect
              ? "Sửa chi tiết lỗi"
              : "Thêm chi tiết lỗi"}
        </DialogTitle>
        <DialogDescription>
          {deleting
            ? `Xác nhận xóa lỗi “${defect?.defect_description}” khỏi biên bản.`
            : "Ghi nhận số lượng, loại sai lỗi và đề nghị xử lý."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {!deleting && (
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-defect-verified">
                Số lượng xác minh
              </Label>
              <Input
                id="verification-defect-verified"
                name="verified_quantity"
                inputMode="decimal"
                defaultValue={defect?.verified_quantity}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-defect-description">
                Lỗi phát hiện
              </Label>
              <Textarea
                id="verification-defect-description"
                name="defect_description"
                defaultValue={defect?.defect_description}
                maxLength={10000}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-defect-quantity">Số lượng lỗi</Label>
              <Input
                id="verification-defect-quantity"
                name="defect_quantity"
                inputMode="decimal"
                defaultValue={defect?.defect_quantity}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-defect-type">Loại sai lỗi</Label>
              <select
                id="verification-defect-type"
                name="defect_type"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={defect?.defect_type || ""}
                required
              >
                <option value="" disabled>
                  Chọn loại sai lỗi
                </option>
                {Object.entries(verificationDefectLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-defect-action">Đề nghị xử lý</Label>
              <Textarea
                id="verification-defect-action"
                name="proposed_action"
                defaultValue={defect?.proposed_action ?? ""}
                maxLength={10000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-defect-note">Ghi chú</Label>
              <Textarea
                id="verification-defect-note"
                name="note"
                defaultValue={defect?.note ?? ""}
                maxLength={10000}
              />
            </div>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant={deleting ? "destructive" : "default"}
            disabled={busy}
          >
            {deleting
              ? busy
                ? "Đang xóa…"
                : "Xóa chi tiết"
              : busy
                ? "Đang lưu…"
                : "Lưu chi tiết"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export type { DefectAction };
